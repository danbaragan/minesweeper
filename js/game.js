const game = {
    init: function () {
        this.drawBoard();
        this.availableFlagsCount = 0;
        this.timeStart = 0;
        this.updateFlags(this.mineCount);
        // weirdly enough - this only works on Firefox.
        // Although MDN says that Chrome has support since v66
        // I enven started a discussion on https://bugs.chromium.org/p/chromium/issues/detail?id=1146467
        this.unregisterController = new AbortController();
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

    updateTime: function() {
        const now = Math.floor(Date.now() / 1000)
        const seconds = now - this.timeStart
        const elem = document.getElementById('elapsed-time-counter')
        elem.value = seconds
        return seconds
    },

    // reference solution for "Create mine flagging feature" user story
    initRightClick: function () {
        // avoid the usage of global game variable from below
        const rightClickHandler = (function(game) {
            return function(e) {
                if (game.isWon()) game.unregisterController.abort()
                if (!e.target.classList.contains('field')) return;
                e.preventDefault();
                if (!game.timeStart) game.timeStart = Math.floor(Date.now() / 1000);

                // if we already have flag - then we clear it and increase the available flags
                const inc = e.target.classList.contains('flagged') ? 1 : -1
                if (game.updateFlags(inc)) {
                    e.target.classList.toggle('flagged');
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
                if (!e.target.classList.contains('field')) return;
                e.preventDefault()
                if (!game.timeStart) game.timeStart = Math.floor(Date.now() / 1000);

                const field = e.target
                const already = field.classList.contains('open') || field.classList.contains('flagged')
                if (already) {
                    return
                }
                field.classList.toggle('open')

                if (field.classList.contains('mine')) {
                    const seconds = game.updateTime()
                    window.alert(`💣  \n(in ${seconds} sec)`)

                    const mineFields = document.querySelectorAll('div.field.mine')
                    mineFields.forEach((f) => f.classList.add('open'))

                    game.unregisterController.abort()
                    return
                    // history.back()
                }

                if (game.isWon()) {
                    const seconds = game.updateTime()
                    window.alert(`🎉 \n(in ${seconds} sec)`)

                    const mineFields = document.querySelectorAll('div.field.mine')
                    mineFields.forEach((f) => f.classList.add('flagged'))

                    game.unregisterController.abort()
                    return
                }

                game.updateGameField(field)
            }

        })(this);

        const gameField = document.getElementById("game-field");
        gameField.addEventListener('click', leftClickHandler, {signal: this.unregisterController.signal})
    },

    updateGameField: function(field) {
        const game = this
        const countNeighborMines = function(field) {
            let surrounding_mines = 0
            for (let n of game.neighbors(field)) {
                if (n.classList.contains('mine')) surrounding_mines += 1
            }
            field.classList.add('open')  // when we go recursive we need to open too
            if (surrounding_mines > 0) {
                field.innerText = surrounding_mines
            } else {
                for (let n of game.neighbors(field)) {
                    if (!n.classList.contains('open') && !n.classList.contains('mine') && !n.classList.contains('flagged')) {
                        console.log(n)
                        countNeighborMines(n)
                    }
                }
            }
            return surrounding_mines
        }

        countNeighborMines(field)
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
