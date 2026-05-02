(function() {
    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    const filenameEl = document.getElementById('filename');

    let pets = [
        { id: 'pet1', name: 'name', type: 'String', x: 150, y: 300, status: 'alive', animPhase: 0 },
        { id: 'pet2', name: 'count', type: 'i32', x: 350, y: 300, status: 'alive', animPhase: 0 },
        { id: 'pet3', name: 'items', type: 'Vec', x: 550, y: 300, status: 'alive', animPhase: 0 }
    ];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 80; // Adjust for header/footer
    }

    window.addEventListener('resize', resize);
    resize();

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'demo':
                // Update pets with demo data
                // We keep the y position consistent for the demo
                pets = message.pets.map(p => ({ ...p, y: canvas.height / 2 }));
                break;
        }
    });

    function animate(time) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw columns
        const columnWidth = 160;
        pets.forEach(pet => {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(pet.x - columnWidth/2, 0, columnWidth, canvas.height);
            
            // Draw column header line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pet.x - columnWidth/2, 40);
            ctx.lineTo(pet.x + columnWidth/2, 40);
            ctx.stroke();
        });

        // Update and draw pets
        pets.forEach(pet => {
            // animPhase: 0 to 2pi over 3 seconds
            pet.animPhase = (time / 3000) * Math.PI * 2;

            const drawFunc = getDrawFunction(pet.type);
            drawFunc(ctx, pet.x, pet.y, 40, pet.status, pet.animPhase);

            // Draw variable name
            ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(pet.name, pet.x, pet.y + 60);

            // Draw type
            ctx.font = '12px "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillText(pet.type, pet.x, pet.y + 80);
        });

        requestAnimationFrame(animate);
    }

    function getDrawFunction(type) {
        if (type === 'String' || type === '&str') return window.Creatures.drawString;
        if (['i32', 'u32', 'f64', 'i64', 'usize'].includes(type)) return window.Creatures.drawNumericCreature;
        if (type.startsWith('Vec')) return window.Creatures.drawVecCreature;
        return window.Creatures.drawNumericCreature; // Default
    }

    requestAnimationFrame(animate);
})();
