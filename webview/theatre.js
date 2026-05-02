(function() {
    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    const filenameEl = document.getElementById('filename');

    /** @type {Map<string, any>} */
    let petMap = new Map();
    let currentEvents = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 80;
    }

    window.addEventListener('resize', resize);
    resize();

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'ownership_events':
                if (message.filename) filenameEl.textContent = message.filename;
                processEvents(message.events);
                break;
        }
    });

    function processEvents(events) {
        currentEvents = events;
        const newPetMap = new Map();
        
        // Group events by variable
        const variableEvents = new Map();
        events.forEach(ev => {
            if (!variableEvents.has(ev.variable)) variableEvents.set(ev.variable, []);
            variableEvents.get(ev.variable).push(ev);
        });

        // Determine active pets and their states
        events.forEach(ev => {
            if (ev.kind === 'born') {
                const existing = petMap.get(ev.variable);
                newPetMap.set(ev.variable, {
                    id: ev.variable,
                    name: ev.variable,
                    type: ev.type_name,
                    status: 'alive',
                    x: existing ? existing.x : 0, // Will be calculated
                    y: canvas.height / 2,
                    animPhase: existing ? existing.animPhase : 0,
                    bornLine: ev.line,
                    isNew: !existing,
                    isDying: false
                });
            } else if (ev.kind === 'moved') {
                if (ev.target) {
                    const mover = petMap.get(ev.variable);
                    if (mover) {
                        mover.status = 'moved_away';
                        mover.targetX = 0; // Will be calculated
                    }
                }
            } else if (ev.kind === 'imm_borrow' || ev.kind === 'mut_borrow') {
                const owner = newPetMap.get(ev.variable) || petMap.get(ev.variable);
                if (owner) {
                    owner.status = 'borrowed_out';
                    owner.borrowKind = ev.kind;
                }
            }
        });

        // Mark dropped pets
        petMap.forEach((pet, id) => {
            const dropEvent = events.find(ev => ev.variable === id && ev.kind === 'dropped');
            if (dropEvent) {
                pet.isDying = true;
                pet.status = 'dead';
            } else if (!newPetMap.has(id)) {
                // If not in new events and not dropped, it might have been moved
                // Keep it if it was moved_away
                if (pet.status === 'moved_away') {
                    newPetMap.set(id, pet);
                }
            } else {
                // Update existing pet
                const newPet = newPetMap.get(id);
                newPet.x = pet.x;
                newPet.animPhase = pet.animPhase;
            }
        });

        // Add dying pets to newPetMap for animation
        petMap.forEach((pet, id) => {
            if (pet.isDying) newPetMap.set(id, pet);
        });

        petMap = newPetMap;
        calculateColumnPositions();
    }

    function calculateColumnPositions() {
        const activePets = Array.from(petMap.values()).filter(p => !p.isDying || p.deathTimer > 0);
        const count = activePets.length;
        if (count === 0) return;

        const spacing = canvas.width / (count + 1);
        activePets.sort((a, b) => a.bornLine - b.bornLine).forEach((pet, i) => {
            pet.targetX = spacing * (i + 1);
            if (pet.x === 0) pet.x = pet.targetX; // Instant jump for first appearance
        });
    }

    function animate(time) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const pets = Array.from(petMap.values());
        
        // Draw columns
        pets.forEach(pet => {
            if (pet.isDying && (!pet.deathTimer || pet.deathTimer <= 0)) return;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(pet.x - 80, 0, 160, canvas.height);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(pet.x - 80, 40);
            ctx.lineTo(pet.x + 80, 40);
            ctx.stroke();
        });

        // Draw tethers
        currentEvents.forEach(ev => {
            if (ev.kind === 'imm_borrow' || ev.kind === 'mut_borrow') {
                const owner = petMap.get(ev.variable);
                // In this simplified demo, the "borrower" isn't always a pet in petMap
                // If it's a let r = &items, r is born after items
                // We'll just draw a line if we find a target pet or a fixed position
                if (owner) {
                    const color = ev.kind === 'imm_borrow' ? '#4facfe' : '#f44336';
                    ctx.strokeStyle = color;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.moveTo(owner.x, owner.y);
                    ctx.lineTo(owner.x + 100, owner.y - 50); // Dummy tether for demo
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        });

        // Update and draw pets
        petMap.forEach((pet, id) => {
            // Smooth movement to targetX
            if (pet.targetX) {
                pet.x += (pet.targetX - pet.x) * 0.1;
            }

            pet.animPhase = (time / 3000) * Math.PI * 2;

            if (pet.isDying) {
                if (pet.deathTimer === undefined) pet.deathTimer = 1.0;
                pet.deathTimer -= 0.02;
                if (pet.deathTimer <= 0) {
                    petMap.delete(id);
                    return;
                }
                ctx.globalAlpha = pet.deathTimer;
            }

            const drawFunc = getDrawFunction(pet.type);
            drawFunc(ctx, pet.x, pet.y, 40, pet.status, pet.animPhase);
            ctx.globalAlpha = 1.0;

            // Draw labels
            ctx.font = 'bold 14px "Segoe UI", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(pet.name, pet.x, pet.y + 60);

            ctx.font = '12px "Segoe UI", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillText(pet.type, pet.x, pet.y + 80);
        });

        requestAnimationFrame(animate);
    }

    function getDrawFunction(type) {
        if (type === 'String' || type === '&str') return window.Creatures.drawString;
        if (['i32', 'u32', 'f64', 'i64', 'usize', 'unknown'].includes(type)) return window.Creatures.drawNumericCreature;
        if (type.startsWith('Vec')) return window.Creatures.drawVecCreature;
        return window.Creatures.drawNumericCreature;
    }

    requestAnimationFrame(animate);
})();
