let boxes = document.querySelectorAll(".box");
let reset_btn = document.querySelector("#reset_game")
let newGameBtn = document.querySelector("#new_btn");
let msgContainer = document.querySelector(".msg_container");
let msg = document.querySelector("#msg")
let main = document.querySelector("main");

let turnO = true;   //Player-X , Player-O
let count = 0;


const winPattern = [
    [0, 1, 2],
    [0, 3, 6],
    [0, 4, 8],
    [1, 4, 7],
    [2, 5, 8],
    [2, 4, 6],
    [3, 4, 5],
    [6, 7, 8]
]

const resetGame = () => {
    turnO = true;
    count = 0;
    enable_boxes();
    msgContainer.classList.add("hide")
}

const newGame = () => {
    turnO = true;
    count = 0;
    enable_boxes();
    main.classList.remove("hide")
    msgContainer.classList.add("hide")
}

boxes.forEach((box) => {
    box.addEventListener("click", () => {

        if (turnO) {
            box.innerText = "O"
            box.classList.add("o")
            turnO = false;
        } else {
            box.innerText = "X"
            box.classList.add("x")
            turnO = true;
        }
        box.disabled = true;
        count++;

        let iswinner = checkWinner();

        if(count === 9 && !iswinner){
            gameDraw();
        }
    })
})

const gameDraw = () => {
    msg.innerText = "Oops! Game Was Draw..."
    main.classList.add("hide")
    msgContainer.classList.remove("hide")
    disable_boxes();
}

const disable_boxes = () => {
    for(let box of boxes) {
        box.disabled = true;
    }
}

const enable_boxes = () => {
    for(let box of boxes) {
        box.disabled = false;
        box.innerText = "";

        box.classList.remove("x","o")
    }
}


const showWinner = (winner) => {
    msg.innerText = `Congatulation , ${winner} is Winner`;  
    main.classList.add("hide");
    msgContainer.classList.remove("hide")
}

const checkWinner = () => {
    for (let pattern of winPattern) {

        let pos1Val = boxes[pattern[0]].innerText
        let pos2Val = boxes[pattern[1]].innerText
        let pos3Val = boxes[pattern[2]].innerText 

        if(pos1Val != "" && pos2Val != "" && pos3Val != ""){
            if (pos1Val === pos2Val && pos2Val === pos3Val){
                showWinner(pos1Val);
            }
        }
    }
}

newGameBtn.addEventListener("click",newGame);
reset_btn.addEventListener("click",resetGame);







