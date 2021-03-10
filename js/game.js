const game = {
    init: function () {
        this.drawBoard();
        this.availableFlagsCount = 0;
        this.updateFlags(this.mineCount);

        // TODO: do the rest of the game setup here (eg. add event listeners)
        this.initLeftClick();
        this.initRightClick();
    },

    drawBoard: function () {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        this.rows = parseInt(urlParams.get('rows'));
        this.cols = parseInt(urlParams.get('cols'));
        this.mineCount = parseInt(urlParams.get('mines'));
        const minePlaces = this.getRandomMineIndexes(this.mineCount, this.cols, this.rows);

        let gameField = document.querySelector(".game-field");
        this.setGameFieldSize(gameField, this.rows, this.cols);
        let cellIndex = 0
        for (let row = 0; row < this.rows; row++) {
            const rowElement = this.addRow(gameField);
            for (let col = 0; col < this.cols; col++) {
                this.addCell(rowElement, row, col, minePlaces.has(cellIndex));
                cellIndex++;
            }
        }
    },

    getRandomMineIndexes: function (mineCount, cols, rows) {
        const cellCount = cols * rows;
        let mines = new Set();
        do {
            mines.add(Math.floor(Math.random() * cellCount));
        } while (mines.size < mineCount && mines.size < cellCount);
        return mines;
    },

    setGameFieldSize: function (gameField, rows, cols) {
        gameField.style.width = (gameField.dataset.cellWidth * rows) + 'px';
        gameField.style.height = (gameField.dataset.cellHeight * cols) + 'px';
    },

    addRow: function (gameField) {
        gameField.insertAdjacentHTML(
            'beforeend',
            '<div class="row"></div>'
        );
        return gameField.lastElementChild;
    },

    addCell: function (rowElement, row, col, isMine) {
        rowElement.insertAdjacentHTML(
            'beforeend',
            `<div class="field${isMine ? ' mine' : ''}"
                        data-row="${row}" data-col="${col}"></div>`);
    },

    updateFlags: function(incValue) {
        let newCount = this.availableFlagsCount + incValue
        if (newCount >= 0 && newCount <= this.mineCount) {
            this.availableFlagsCount = newCount
            const elem = document.getElementById('flags-left-counter')
            elem.value = this.availableFlagsCount
            return true
        }
        return false
    },

    isWon: function() {
        const openedFields = document.querySelectorAll('div.field.open')
        if (this.rows * this.cols - openedFields.length === this.mineCount) {
            return true
        }
    },

    // reference solution for "Create mine flagging feature" user story
    initRightClick: function () {
        // avoid the usage of global game variable from below
        const rightClickHandler = (function(game) {
            return function(e) {
                e.preventDefault();
                if (e.target.classList.contains('field')) {
                    // if we already have flag - then we clear it and increase the available flags
                    const inc = e.target.classList.contains('flagged') ? 1 : -1
                    if (game.updateFlags(inc)) {
                        e.target.classList.toggle('flagged');
                    }
                }
            }
        })(this);

        // let's put this high up on the whole field and let it bubble up from the specific game tile
        const gameField = document.getElementById("game-field");
        gameField.addEventListener('contextmenu', rightClickHandler)
    },

    initLeftClick: function () {
        const leftClickHandler = (function(game) {
            return function (e) {
                if (!e.target.classList.contains('field')) {
                    return;
                }
                e.preventDefault()
                const field = e.target
                const already = field.classList.contains('open') || field.classList.contains('flagged')
                if (already) {
                    return
                }
                if (field.classList.contains('mine')) {
                    window.alert('BooM')
                    history.back()
                }
                field.classList.toggle('open')

                if (game.isWon()) {
                    window.alert('🎉')
                }

                let surrounding_mines = 0
                for (let n of game.neighbors(field)) {
                    if (n.classList.contains('mine')) surrounding_mines += 1
                }
                if (surrounding_mines > 0) {
                    field.innerText = surrounding_mines
                }
            }

        })(this);

        const gameField = document.getElementById("game-field");
        gameField.addEventListener('click', leftClickHandler)
    },

    neighbors: function*(field) {
        const [row, col] = [+field.dataset.row, +field.dataset.col]
        let surrounding_coordinates = [
            [row - 1, col - 1],
            [row - 1, col],
            [row - 1, col + 1],
            [row, col + 1],
            [row + 1, col + 1],
            [row + 1, col],
            [row + 1, col - 1],
            [row, col - 1],
        ]
        for (const coords of surrounding_coordinates) {
            if (coords[0] < 0 || coords[1] < 0) continue;
            if (coords[0] >= this.rows || coords[1] >= this.cols) continue;
            let neighbor = document.querySelector(`.game-field div[data-row="${coords[0]}"][data-col="${coords[1]}"]`)
            yield neighbor
        }
    },
};

game.init();
