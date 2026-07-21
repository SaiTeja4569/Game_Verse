// ==========================================
// Supabase Integration Layer for GameVerse
// ==========================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// IMPORTANT: Replace the placeholders below with your actual Supabase project credentials.
// You can find these in your Supabase project dashboard under Project Settings > API.
const SUPABASE_URL = 'https://nmynvhcxsqgtbwykvbnr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xI8U1-17CBoMjcxwo9BFnA_M8jvU3xi';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Initialize / check authentication state
 */
export async function sbInit() {
  // Can be used to check initial session details if required
  return true;
}

/**
 * Map Supabase profile DB record to GameVerse format
 */
function mapProfileToLocalUser(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    avatar: profile.avatar || '1',
    isAdmin: !!profile.is_admin,
    isDisabled: !!profile.is_disabled,
    joinedDate: profile.joined_date,
    stats: profile.stats || {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      highestStreak: 0,
      points: 0,
      favGame: "None"
    },
    achievements: profile.achievements || []
  };
}

/**
 * Fetch profile by User ID
 */
export async function sbGetCurrentUser(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return mapProfileToLocalUser(data);
}

/**
 * Register a user via Supabase Auth + profile table insertion
 */
export async function sbRegister(username, email, password, avatar = '1') {
  // Check unique constraints first in the database profiles table
  const { data: existingUser, error: checkError } = await supabase
    .from('profiles')
    .select('username, email')
    .or(`username.eq.${username},email.eq.${email}`)
    .maybeSingle();

  if (existingUser) {
    if (existingUser.username.toLowerCase() === username.toLowerCase()) {
      throw new Error('Username already exists.');
    }
    if (existingUser.email.toLowerCase() === email.toLowerCase()) {
      throw new Error('Email is already registered.');
    }
  }

  // Register in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        avatar
      }
    }
  });

  if (authError) throw authError;

  // Return the constructed profile object in memory to prevent race conditions with the database trigger
  return {
    id: authData.user.id,
    username,
    email,
    avatar,
    isAdmin: false,
    isDisabled: false,
    joinedDate: new Date().toISOString(),
    stats: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      streak: 0,
      highestStreak: 0,
      points: 0,
      favGame: "None"
    },
    achievements: []
  };
}

/**
 * Authenticate user with email and password
 */
export async function sbLogin(email, password) {
  // Sign in using Supabase Auth directly with the email
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) throw authError;

  // Retrieve their user profile row
  const profile = await sbGetCurrentUser(authData.user.id);

  if (profile.isDisabled) {
    await supabase.auth.signOut();
    throw new Error('This account has been disabled by an administrator.');
  }

  return profile;
}

/**
 * Update user profile details in public.profiles table
 */
export async function sbUpdateProfile(userId, username, email, avatar) {
  // Check unique constraints if changed
  const { data: conflictUsers, error: conflictError } = await supabase
    .from('profiles')
    .select('id, username, email')
    .or(`username.eq.${username},email.eq.${email}`);

  if (conflictUsers && conflictUsers.length > 0) {
    const usernameConflict = conflictUsers.some(u => u.id !== userId && u.username.toLowerCase() === username.toLowerCase());
    const emailConflict = conflictUsers.some(u => u.id !== userId && u.email.toLowerCase() === email.toLowerCase());
    if (usernameConflict) throw new Error('Username already in use.');
    if (emailConflict) throw new Error('Email already in use.');
  }

  // Update in profiles table
  const { data, error } = await supabase
    .from('profiles')
    .update({ username, email, avatar })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return mapProfileToLocalUser(data);
}

/**
 * Update password securely inside Supabase Auth
 */
export async function sbChangePassword(userId, oldPassword, newPassword) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not logged in.');

  // Re-authenticate by signing in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: oldPassword
  });

  if (signInError) {
    throw new Error('Current password is incorrect.');
  }

  // Update password in Auth
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) throw updateError;
  return true;
}

/**
 * Unlock achievement for user
 */
export async function sbUnlockAchievement(userId, achievementId) {
  const { data: profile, error: getError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (getError || !profile) return false;
  if (profile.is_admin) return false;

  const achievements = [...(profile.achievements || [])];
  if (achievements.some(a => a.id === achievementId)) {
    return false; // already unlocked
  }

  achievements.push({
    id: achievementId,
    unlockedAt: new Date().toISOString()
  });

  const { data, error } = await supabase
    .from('profiles')
    .update({ achievements })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return mapProfileToLocalUser(data);
}

/**
 * Map match from DB to local format
 */
function mapMatchToLocal(match) {
  if (!match) return null;
  return {
    id: match.id,
    userId: match.user_id,
    game: match.game,
    result: match.result,
    difficulty: match.difficulty,
    details: match.details,
    timestamp: match.timestamp,
    isAdminMatch: !!match.is_admin_match
  };
}

/**
 * Log a game match and recalculate user stats
 */
export async function sbSaveMatch(userId, matchData) {
  const { data: profile, error: getError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (getError || !profile) throw new Error('User not found.');

  const is_admin_match = !!profile.is_admin;
  const matchId = (is_admin_match ? 'mat_admin_' : 'mat_') + Date.now() + Math.random().toString(36).substr(2, 5);

  const newMatch = {
    id: matchId,
    user_id: userId,
    game: matchData.game,
    result: matchData.result,
    difficulty: matchData.difficulty,
    details: matchData.details + (is_admin_match ? ' (Admin Test Match)' : ''),
    timestamp: new Date().toISOString(),
    is_admin_match
  };

  // Insert match record
  const { error: matchError } = await supabase
    .from('matches')
    .insert(newMatch);

  if (matchError) throw matchError;

  // Admin gameplay is stored but doesn't affect statistics
  if (is_admin_match) {
    return { match: mapMatchToLocal(newMatch), user: mapProfileToLocalUser(profile) };
  }

  // Update User Stats
  const stats = { ...profile.stats };
  stats.gamesPlayed++;

  if (matchData.result === 'Win') {
    stats.wins++;
    stats.streak++;
    stats.points += 10;
    if (stats.streak > stats.highestStreak) {
      stats.highestStreak = stats.streak;
    }
  } else if (matchData.result === 'Loss') {
    stats.losses++;
    stats.streak = 0;
  } else {
    stats.draws++;
    stats.points += 5;
    stats.streak = 0;
  }

  // Recalculate favorite game
  const { data: userMatches, error: matchesError } = await supabase
    .from('matches')
    .select('game')
    .eq('user_id', userId)
    .eq('is_admin_match', false);

  if (userMatches && userMatches.length > 0) {
    const counts = userMatches.reduce((acc, curr) => {
      acc[curr.game] = (acc[curr.game] || 0) + 1;
      return acc;
    }, {});

    let fav = 'None';
    let max = 0;
    for (const key in counts) {
      if (counts[key] > max) {
        max = counts[key];
        fav = key;
      }
    }
    stats.favGame = fav;
  }

  // Save updated profile stats
  const { data: updatedProfile, error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ stats })
    .eq('id', userId)
    .select()
    .single();

  if (profileUpdateError) throw profileUpdateError;

  return { match: mapMatchToLocal(newMatch), user: mapProfileToLocalUser(updatedProfile) };
}

/**
 * Fetch matches for a user
 */
export async function sbGetMatchHistory(userId) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data.map(mapMatchToLocal);
}

/**
 * Fetch all matches
 */
export async function sbGetAllMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data.map(mapMatchToLocal);
}

/**
 * Retrieve ranks for leaderboard from public.profiles table
 */
export async function sbGetLeaderboard() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_disabled', false)
    .eq('is_admin', false);

  if (error) throw error;

  return data
    .map(u => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar,
      gamesPlayed: u.stats?.gamesPlayed || 0,
      wins: u.stats?.wins || 0,
      points: u.stats?.points || 0,
      winPercentage: (u.stats?.gamesPlayed || 0) > 0 ? Math.round(((u.stats?.wins || 0) / u.stats.gamesPlayed) * 100) : 0
    }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins);
}

/**
 * Fetch all registered users
 */
export async function sbGetAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('joined_date', { ascending: true });

  if (error) throw error;
  return data.map(mapProfileToLocalUser);
}

/**
 * Toggle user account status
 */
export async function sbSetUserStatus(userId, disabled) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_disabled: disabled })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return mapProfileToLocalUser(data);
}

/**
 * Delete a user and cascade delete their matches
 */
export async function sbDeleteUser(userId) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) throw error;

  const adminMeta = await sbGetAdminMeta();
  adminMeta.deletedAccounts = (adminMeta.deletedAccounts || 0) + 1;
  await sbUpdateAdminMeta(adminMeta);

  return true;
}

/**
 * Reset statistics for a user
 */
export async function sbResetUserStats(userId) {
  const stats = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    streak: 0,
    highestStreak: 0,
    points: 0,
    favGame: "None"
  };

  const { data, error } = await supabase
    .from('profiles')
    .update({ stats })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  // Clear matches for this user
  const { error: matchesError } = await supabase
    .from('matches')
    .delete()
    .eq('user_id', userId);

  if (matchesError) throw matchesError;

  return mapProfileToLocalUser(data);
}

/**
 * Reset achievements for a user
 */
export async function sbResetUserAchievements(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ achievements: [] })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return mapProfileToLocalUser(data);
}

/**
 * Reset all game stats in system (deletes all matches, resets stats & achievements)
 */
export async function sbResetAllGameStats() {
  const { error: matchesError } = await supabase
    .from('matches')
    .delete()
    .neq('id', 'placeholder_id');
  if (matchesError) throw matchesError;

  const { data: users, error: fetchError } = await supabase
    .from('profiles')
    .select('id');
  if (fetchError) throw fetchError;

  for (const user of users) {
    await supabase
      .from('profiles')
      .update({
        achievements: [],
        stats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          streak: 0,
          highestStreak: 0,
          points: 0,
          favGame: "None"
        }
      })
      .eq('id', user.id);
  }

  return true;
}

/**
 * Calculate dashboard statistics dynamically
 */
export async function sbGetAdminStats() {
  const { data: users, error: errU } = await supabase.from('profiles').select('*');
  const { data: matches, error: errM } = await supabase.from('matches').select('*');

  if (errU || errM) throw new Error('Failed to load admin stats');

  const totalUsers = users.filter(u => !u.is_admin).length;
  const totalMatches = matches.length;

  const activePlayers = users.filter(u => !u.is_admin && !u.is_disabled);
  let topPlayer = "None";
  let maxPoints = -1;
  activePlayers.forEach(p => {
    if (p.stats && p.stats.points > maxPoints) {
      maxPoints = p.stats.points;
      topPlayer = p.username;
    }
  });

  const counts = matches.reduce((acc, curr) => {
    acc[curr.game] = (acc[curr.game] || 0) + 1;
    return acc;
  }, {});
  let favGame = "None";
  let maxCount = 0;
  for (const key in counts) {
    if (counts[key] > maxCount) {
      maxCount = counts[key];
      favGame = key;
    }
  }

  return {
    totalUsers,
    totalMatches,
    topPlayer,
    favGame
  };
}

/**
 * Retrieve admin metadata object (stored in default admin profile's stats object)
 */
export async function sbGetAdminMeta() {
  const { data: admin, error } = await supabase
    .from('profiles')
    .select('stats')
    .eq('is_admin', true)
    .maybeSingle();

  if (error || !admin || !admin.stats) {
    return { lastLogin: null, deletedAccounts: 0, demoDataSeeded: 0, databaseResets: 0 };
  }

  return {
    lastLogin: admin.stats.lastLogin || null,
    deletedAccounts: admin.stats.deletedAccounts || 0,
    demoDataSeeded: admin.stats.demoDataSeeded || 0,
    databaseResets: admin.stats.databaseResets || 0
  };
}

/**
 * Save admin metadata object
 */
export async function sbUpdateAdminMeta(newMeta) {
  const { data: admin } = await supabase
    .from('profiles')
    .select('stats')
    .eq('is_admin', true)
    .maybeSingle();

  if (admin) {
    const stats = { ...admin.stats, ...newMeta };
    await supabase
      .from('profiles')
      .update({ stats })
      .eq('is_admin', true);
  }
}

/**
 * Fully clear non-admin profiles and matches
 */
export async function sbClearData() {
  await supabase.from('matches').delete().neq('id', 'placeholder');
  await supabase.from('profiles').delete().eq('is_admin', false);

  const adminMeta = await sbGetAdminMeta();
  adminMeta.databaseResets = (adminMeta.databaseResets || 0) + 1;
  await sbUpdateAdminMeta(adminMeta);

  return true;
}

/**
 * Seed demo records in Supabase
 */
export async function sbSeedDemoData() {
  // Clean old seeded data, leaving admins
  await supabase.from('profiles').delete().eq('is_admin', false);
  await supabase.from('matches').delete().neq('id', 'placeholder');

  const demoUsers = [
    { username: "ShadowBlade", email: "shadow@gameverse.com", password: "user123", avatar: "1" },
    { username: "PixelKing", email: "pixel@gameverse.com", password: "user123", avatar: "3" },
    { username: "RetroGamer", email: "retro@gameverse.com", password: "user123", avatar: "2" },
    { username: "ApexHunter", email: "hunter@gameverse.com", password: "user123", avatar: "4" },
    { username: "ViperQc", email: "viper@gameverse.com", password: "user123", avatar: "6" }
  ];

  for (let idx = 0; idx < demoUsers.length; idx++) {
    const usr = demoUsers[idx];

    // Register user via Auth first
    let userId;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: usr.email,
      password: usr.password,
      options: { data: { username: usr.username, avatar: usr.avatar } }
    });

    if (signUpError) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', usr.email)
        .maybeSingle();
      if (existingProfile) userId = existingProfile.id;
      else continue;
    } else {
      userId = signUpData.user.id;
    }

    const stats = {
      gamesPlayed: 10 + idx * 5,
      wins: 6 + idx * 3,
      losses: 2 + idx,
      draws: 2 + idx,
      streak: idx + 1,
      highestStreak: idx + 3,
      favGame: idx % 2 === 0 ? "Tic Tac Toe" : "Rock Paper Scissors",
      points: (6 + idx * 3) * 10 + (2 + idx) * 5
    };

    const achievements = [
      { id: "first-win", unlockedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString() }
    ];
    if (stats.wins >= 10) {
      achievements.push({ id: "wins-10", unlockedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() });
    }
    if (idx === 4) {
      achievements.push({ id: "streak-5", unlockedAt: new Date().toISOString() });
      achievements.push({ id: "defeat-hard-ai", unlockedAt: new Date().toISOString() });
    }

    const profileData = {
      id: userId,
      username: usr.username,
      email: usr.email,
      avatar: usr.avatar,
      is_admin: false,
      is_disabled: false,
      joined_date: new Date(Date.now() - (30 - idx * 5) * 24 * 60 * 60 * 1000).toISOString(),
      stats,
      achievements
    };

    await supabase.from('profiles').upsert(profileData);

    // Generate matches
    for (let i = 0; i < stats.gamesPlayed; i++) {
      let res = "Win";
      if (i < stats.losses) res = "Loss";
      else if (i < stats.losses + stats.draws) res = "Draw";

      const match = {
        id: `demo_m_${idx}_${i}`,
        user_id: userId,
        game: i % 2 === 0 ? "Tic Tac Toe" : "Rock Paper Scissors",
        result: res,
        difficulty: i % 3 === 0 ? "Hard" : (i % 3 === 1 ? "Medium" : "Easy"),
        details: res === "Win" ? "Victorious match against bot AI" : (res === "Loss" ? "Defeated by bot" : "Stalemate split decision"),
        timestamp: new Date(Date.now() - (i + 1) * 12 * 60 * 60 * 1000).toISOString(),
        is_admin_match: false
      };

      await supabase.from('matches').upsert(match);
    }
  }

  const adminMeta = await sbGetAdminMeta();
  adminMeta.demoDataSeeded = (adminMeta.demoDataSeeded || 0) + 1;
  await sbUpdateAdminMeta(adminMeta);

  return true;
}
