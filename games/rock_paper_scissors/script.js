let userScore = 0;
let compScore = 0;

const choices = document.querySelectorAll(".choice");
const msg = document.querySelector("#msg")

const user_score = document.querySelector("#user_score");
const comp_score = document.querySelector("#comp_score");


const genCompChoice = () => {
    const options = ["rock" , "paper" , "scissors"]
    const randidx = Math.floor(Math.random() * 3);
    return options[randidx]
}

const drawGame = () => {
    msg.innerText = "Game Was Drawn. Play Again"
    msg.style.backgroundColor = "rgb(2, 2, 36)"
}

const showWinner = (userWin , userChoice , compChoice) => {
    if(userWin) {
        userScore++;
        user_score.innerText = userScore
        msg.innerText = `You Won! Your ${userChoice} beats ${compChoice}`
        msg.style.backgroundColor = "green"
    }
    else {
        compScore++;
        comp_score.innerText = compScore
        msg.innerText = `You Lost! ${compChoice} beats your ${userChoice}`
        msg.style.backgroundColor = "red"
    }
}

const playGame = (userChoice) => {
    const compChoice = genCompChoice();

    if (userChoice === compChoice) {
        drawGame();
    } else {
        let userWin = true;
        if (userChoice === "rock"){
            // scissors , paper
            userWin = compChoice === "paper" ? false : true;
        } else if (userChoice === "paper") {
            // rock,scissors
            userWin = compChoice === "scissors" ? false : true;
        } else {
            // rock , paper
            userWin = compChoice === "rock" ? false : true;
        }
        showWinner(userWin , userChoice , compChoice);
    }
}


choices.forEach((choice) => {
    choice.addEventListener("click", () => {
        const userChoice = choice.getAttribute("id")
        playGame(userChoice);
    })
})


