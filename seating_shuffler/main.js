document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const optimizeBtn = document.getElementById('optimizeBtn');
    const gridContainer = document.getElementById('gridContainer');
    const columnsInput = document.getElementById('columns');
    const studentCountInput = document.getElementById('studentCount');
    const columnConfig = document.getElementById('columnConfig');
    const displayTitle = document.getElementById('displayTitle');
    const resultHeader = document.getElementById('resultHeader');
    const printBtn = document.getElementById('printBtn');
    const podiumIndicator = document.getElementById('podiumIndicator');
    const seatDirection = document.getElementById('seatDirection');
    const printTitle = document.getElementById('printTitle');

    // Initialize column configuration
    let columnSeats = [];

    function initColumnConfig(numColumns, seatsArray = null) {
        columnConfig.innerHTML = '';
        columnSeats = [];

        for (let i = 0; i < numColumns; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'column-seat-input';

            const label = document.createElement('span');
            label.className = 'col-label';
            label.textContent = `${i + 1}列`;

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '1';
            input.max = '10';
            input.value = seatsArray ? seatsArray[i] : '6';
            input.dataset.col = i;

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            columnConfig.appendChild(wrapper);
            columnSeats.push(input);
        }
    }

    // Optimize seat distribution based on student count and columns
    function optimizeDistribution() {
        const studentCount = parseInt(studentCountInput.value) || 36;
        const columns = parseInt(columnsInput.value) || 6;

        if (studentCount < 1 || columns < 1) return;

        // Calculate base seats per column and remainder
        const baseSeats = Math.floor(studentCount / columns);
        const remainder = studentCount % columns;

        // Distribute: remainder columns get baseSeats+1, rest get baseSeats
        // Distribute extra seats from the center outward for balanced look
        const seatsArray = new Array(columns).fill(baseSeats);

        // Add remainder seats from center outward
        let left = Math.floor((columns - 1) / 2);
        let right = Math.ceil((columns - 1) / 2);
        let remaining = remainder;

        while (remaining > 0) {
            if (remaining > 0 && left >= 0) {
                seatsArray[left]++;
                remaining--;
                left--;
            }
            if (remaining > 0 && right < columns) {
                seatsArray[right]++;
                remaining--;
                right++;
            }
        }

        // Update the inputs
        initColumnConfig(columns, seatsArray);
    }

    // Initialize with default 6 columns
    initColumnConfig(6);

    // Update column config when column count changes
    columnsInput.addEventListener('input', () => {
        let cols = parseInt(columnsInput.value) || 6;
        if (cols < 1) cols = 1;
        if (cols > 10) cols = 10;
        initColumnConfig(cols);
    });

    // Auto-optimize button
    optimizeBtn.addEventListener('click', optimizeDistribution);

    // Generate handler
    generateBtn.addEventListener('click', () => {
        const className = document.getElementById('className').value;
        const columns = parseInt(columnsInput.value) || 6;

        // Get seat counts per column (in display order: left to right from teacher's view)
        const seatsPerColumnDisplay = columnSeats.map(input => {
            let val = parseInt(input.value) || 6;
            if (val < 1) val = 1;
            if (val > 10) val = 10;
            return val;
        });

        // Reverse for internal processing so column 1 (teacher's left) is first in grid
        // Actually, we want column 1 to appear on the LEFT when viewing from podium
        // The grid renders left-to-right, so we need to keep the order as-is
        const seatsPerColumn = seatsPerColumnDisplay;

        // Calculate total seats
        const totalSeats = seatsPerColumn.reduce((sum, n) => sum + n, 0);

        if (totalSeats < 1 || totalSeats > 100) {
            alert('座席数は1〜100の間で設定してください');
            return;
        }

        // Update Header
        displayTitle.textContent = `${className} 席替え結果`;
        printTitle.textContent = className; // 印刷用（クラス名のみ）
        resultHeader.style.display = 'flex';
        podiumIndicator.style.display = 'block';

        generateSeats(totalSeats, columns, seatsPerColumn);
    });

    printBtn.addEventListener('click', () => {
        window.print();
    });

    function generateSeats(n, cols, seatsPerColumn) {
        // Clear grid
        gridContainer.innerHTML = '';

        // Create numbers array [1...n]
        const numbers = Array.from({ length: n }, (_, i) => i + 1);

        // Fisher-Yates Shuffle
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }

        // Find max rows needed
        const maxRows = Math.max(...seatsPerColumn);

        // Create a 2D grid structure [row][col]
        // Row 0 is FRONT (closest to podium)
        // Column 0 is LEFT from teacher's perspective
        const grid = [];
        for (let row = 0; row < maxRows; row++) {
            grid[row] = [];
            for (let col = 0; col < cols; col++) {
                grid[row][col] = null; // null means empty/no seat
            }
        }

        // Assign shuffled numbers to grid positions
        // Fill from front to back (row 0 = front), left to right
        let numIndex = 0;
        for (let col = 0; col < cols; col++) {
            const rowsInThisCol = seatsPerColumn[col];
            for (let row = 0; row < rowsInThisCol; row++) {
                if (numIndex < numbers.length) {
                    grid[row][col] = numbers[numIndex];
                    numIndex++;
                }
            }
        }

        // Set grid template
        gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        // Render grid (row 0 = front, displayed at top)
        let animationIndex = 0;
        for (let row = 0; row < maxRows; row++) {
            for (let col = 0; col < cols; col++) {
                const cellValue = grid[row][col];

                const seat = document.createElement('div');

                if (cellValue !== null) {
                    seat.className = 'seat';
                    seat.style.animationDelay = `${animationIndex * 0.03}s`;
                    animationIndex++;

                    // ドラッグ＆ドロップ属性を追加
                    seat.draggable = true;
                    seat.dataset.seatNumber = cellValue;

                    const label = document.createElement('span');
                    label.className = 'label';
                    label.textContent = '座席';

                    const numberSpan = document.createElement('span');
                    numberSpan.className = 'number';
                    numberSpan.textContent = cellValue;

                    seat.appendChild(label);
                    seat.appendChild(numberSpan);

                    // ドラッグイベント
                    seat.addEventListener('dragstart', handleDragStart);
                    seat.addEventListener('dragend', handleDragEnd);
                    seat.addEventListener('dragover', handleDragOver);
                    seat.addEventListener('dragenter', handleDragEnter);
                    seat.addEventListener('dragleave', handleDragLeave);
                    seat.addEventListener('drop', handleDrop);

                    // タッチイベント（iPad/タブレット対応）
                    seat.addEventListener('touchstart', handleTouchStart, { passive: false });
                    seat.addEventListener('touchmove', handleTouchMove, { passive: false });
                    seat.addEventListener('touchend', handleTouchEnd, { passive: false });
                } else {
                    // Empty placeholder to maintain grid structure
                    seat.className = 'seat-placeholder';
                }

                gridContainer.appendChild(seat);
            }
        }
    }

    // ドラッグ＆ドロップ用の変数
    let draggedSeat = null;

    function handleDragStart(e) {
        draggedSeat = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.seatNumber);
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        // すべての drag-over クラスを削除
        document.querySelectorAll('.seat.drag-over').forEach(seat => {
            seat.classList.remove('drag-over');
        });
        draggedSeat = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e) {
        e.preventDefault();
        if (this !== draggedSeat && this.classList.contains('seat')) {
            this.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');

        if (draggedSeat && this !== draggedSeat && this.classList.contains('seat')) {
            // 座席番号を入れ替え
            const draggedNumber = draggedSeat.dataset.seatNumber;
            const targetNumber = this.dataset.seatNumber;

            // 番号を交換
            draggedSeat.querySelector('.number').textContent = targetNumber;
            draggedSeat.dataset.seatNumber = targetNumber;

            this.querySelector('.number').textContent = draggedNumber;
            this.dataset.seatNumber = draggedNumber;

            // opacityを確実に復元
            this.style.opacity = '1';
            draggedSeat.style.opacity = '1';

            // 入れ替えアニメーション
            this.classList.add('swapped');
            draggedSeat.classList.add('swapped');

            const targetSeat = this;
            const sourceSeat = draggedSeat;
            setTimeout(() => {
                targetSeat.classList.remove('swapped');
                if (sourceSeat) sourceSeat.classList.remove('swapped');
            }, 300);
        }
    }

    // ========================================
    // タッチイベント対応（iPad/タブレット用）
    // ========================================
    let touchDraggedSeat = null;
    let touchClone = null;
    let touchStartX = 0;
    let touchStartY = 0;

    function handleTouchStart(e) {
        if (!this.classList.contains('seat')) return;

        e.preventDefault();
        touchDraggedSeat = this;

        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;

        // ドラッグ中の視覚的フィードバック
        this.classList.add('dragging');

        // ドラッグ中に表示するクローンを作成
        touchClone = this.cloneNode(true);
        touchClone.classList.add('touch-clone');
        touchClone.style.position = 'fixed';
        touchClone.style.left = `${touch.clientX - 40}px`;
        touchClone.style.top = `${touch.clientY - 40}px`;
        touchClone.style.width = '80px';
        touchClone.style.height = '80px';
        touchClone.style.pointerEvents = 'none';
        touchClone.style.zIndex = '1000';
        touchClone.style.opacity = '0.9';
        touchClone.style.transform = 'scale(1.1)';
        touchClone.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
        document.body.appendChild(touchClone);
    }

    function handleTouchMove(e) {
        if (!touchDraggedSeat || !touchClone) return;

        e.preventDefault();
        const touch = e.touches[0];

        // クローンを指の位置に追従させる
        touchClone.style.left = `${touch.clientX - 40}px`;
        touchClone.style.top = `${touch.clientY - 40}px`;

        // 現在タッチしている要素を検出
        // クローンを一時的に非表示にして下の要素を取得
        touchClone.style.display = 'none';
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        touchClone.style.display = '';

        // すべてのdrag-overクラスを削除
        document.querySelectorAll('.seat.drag-over').forEach(seat => {
            seat.classList.remove('drag-over');
        });

        // ドロップ先の座席をハイライト
        if (elementBelow) {
            const targetSeat = elementBelow.closest('.seat');
            if (targetSeat && targetSeat !== touchDraggedSeat && targetSeat.classList.contains('seat')) {
                targetSeat.classList.add('drag-over');
            }
        }
    }

    function handleTouchEnd(e) {
        if (!touchDraggedSeat) return;

        e.preventDefault();

        // クローンを削除
        if (touchClone) {
            touchClone.remove();
            touchClone = null;
        }

        // ドラッグスタイルを削除
        touchDraggedSeat.classList.remove('dragging');

        // すべてのdrag-overクラスを削除
        const dragOverSeat = document.querySelector('.seat.drag-over');
        document.querySelectorAll('.seat.drag-over').forEach(seat => {
            seat.classList.remove('drag-over');
        });

        // ドロップ先が有効な座席かチェック
        if (dragOverSeat && dragOverSeat !== touchDraggedSeat) {
            // 座席番号を入れ替え
            const draggedNumber = touchDraggedSeat.dataset.seatNumber;
            const targetNumber = dragOverSeat.dataset.seatNumber;

            // 番号を交換
            touchDraggedSeat.querySelector('.number').textContent = targetNumber;
            touchDraggedSeat.dataset.seatNumber = targetNumber;

            dragOverSeat.querySelector('.number').textContent = draggedNumber;
            dragOverSeat.dataset.seatNumber = draggedNumber;

            // 入れ替えアニメーション
            dragOverSeat.classList.add('swapped');
            touchDraggedSeat.classList.add('swapped');

            const targetSeat = dragOverSeat;
            const sourceSeat = touchDraggedSeat;
            setTimeout(() => {
                targetSeat.classList.remove('swapped');
                if (sourceSeat) sourceSeat.classList.remove('swapped');
            }, 300);
        }

        touchDraggedSeat = null;
    }
});
