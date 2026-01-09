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
        seatDirection.style.display = 'block';

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

                    const label = document.createElement('span');
                    label.className = 'label';
                    label.textContent = '座席';

                    const numberSpan = document.createElement('span');
                    numberSpan.textContent = cellValue;

                    seat.appendChild(label);
                    seat.appendChild(numberSpan);
                } else {
                    // Empty placeholder to maintain grid structure
                    seat.className = 'seat-placeholder';
                }

                gridContainer.appendChild(seat);
            }
        }
    }
});
