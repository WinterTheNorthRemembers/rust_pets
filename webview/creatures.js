(function() {
    window.Creatures = {
        drawString: function(ctx, x, y, size, status, animPhase) {
            const wobble = Math.sin(animPhase) * 5;
            ctx.save();
            ctx.translate(x, y);

            // Caterpillar: 4 circles
            const segmentCount = 4;
            const segmentSpacing = size * 0.5;
            
            for (let i = 0; i < segmentCount; i++) {
                const segmentX = (i - (segmentCount - 1) / 2) * segmentSpacing;
                const segmentY = Math.sin(animPhase + i * 0.5) * 3;
                
                let color = '#4caf50'; // Green
                let opacity = 1.0;
                
                if (status === 'moved_away') color = '#9e9e9e';
                if (status === 'borrowed_out') opacity = 0.5;
                if (status === 'dead') {
                    color = '#f44336';
                    ctx.translate(Math.random() * 2 - 1, Math.random() * 2 - 1);
                }

                ctx.beginPath();
                ctx.arc(segmentX, segmentY, size / 2, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.globalAlpha = opacity;
                ctx.fill();
                
                // Add some detail
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Head (last segment)
            const headX = ((segmentCount - 1) - (segmentCount - 1) / 2) * segmentSpacing;
            ctx.beginPath();
            ctx.arc(headX + size/4, Math.sin(animPhase + 3 * 0.5) * 3 - size/6, size/10, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();

            ctx.restore();
        },

        drawNumericCreature: function(ctx, x, y, size, status, animPhase) {
            const pulse = 1 + Math.sin(animPhase) * 0.05;
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(pulse, pulse);

            let color = '#607d8b'; // Blue-grey
            let opacity = 1.0;
            
            if (status === 'moved_away') color = '#9e9e9e';
            if (status === 'borrowed_out') opacity = 0.5;
            if (status === 'dead') color = '#f44336';

            // Rock Golem: Lumpy pentagon
            ctx.beginPath();
            const sides = 5;
            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const r = size * (0.8 + Math.sin(i * 1.5) * 0.2);
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            
            ctx.fillStyle = color;
            ctx.globalAlpha = opacity;
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.stroke();

            // Eyes
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(-size/4, -size/10, size/8, 0, Math.PI * 2);
            ctx.arc(size/4, -size/10, size/8, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        },

        drawVecCreature: function(ctx, x, y, size, status, animPhase) {
            ctx.save();
            ctx.translate(x, y);

            let color = '#ff9800'; // Orange
            let opacity = 1.0;
            
            if (status === 'moved_away') color = '#9e9e9e';
            if (status === 'borrowed_out') opacity = 0.5;
            if (status === 'dead') color = '#f44336';

            // Snake: Curved S-shape
            ctx.beginPath();
            ctx.lineWidth = size / 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = color;
            ctx.globalAlpha = opacity;

            const tailWag = Math.sin(animPhase * 2) * 20;
            ctx.moveTo(-size, tailWag);
            ctx.bezierCurveTo(-size/2, -size + tailWag, size/2, size, size, 0);
            ctx.stroke();

            // Head
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(size, 0, size/3, 0, Math.PI * 2);
            ctx.fill();
            
            // Eye
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(size + size/8, -size/10, size/12, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    };
})();
