/*
 * Pure collision helpers — no game state, no DOM. Easy to unit test.
 */
(function (FN) {
    'use strict';

    /* Circle (cx, cy, r) vs axis-aligned rect {x, y, w, h}. */
    function circleRect(cx, cy, r, rect) {
        const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
        const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
        const dx = cx - nearestX;
        const dy = cy - nearestY;
        return dx * dx + dy * dy < r * r;
    }

    function circleCircle(ax, ay, ar, bx, by, br) {
        const dx = ax - bx;
        const dy = ay - by;
        const rr = ar + br;
        return dx * dx + dy * dy < rr * rr;
    }

    /*
     * Full collision query for the player against the world.
     * Returns { collided, type: 'ground' | 'obstacle' | null, obstacleId }.
     */
    function checkPlayerCollision(player, obstacles, config) {
        const groundY = config.worldHeight - config.groundHeight;
        if (player.y + player.radius >= groundY) {
            return { collided: true, type: 'ground', obstacleId: null };
        }
        for (const obstacle of obstacles) {
            // Cheap broad-phase on the x axis first.
            const left = obstacle.x - config.capOverhang - player.radius;
            const right = obstacle.x + obstacle.width + config.capOverhang + player.radius;
            if (player.x < left || player.x > right) continue;
            const rects = obstacle.getRects(config);
            for (const rect of rects) {
                if (circleRect(player.x, player.y, player.radius, rect)) {
                    return { collided: true, type: 'obstacle', obstacleId: obstacle.id };
                }
            }
        }
        return { collided: false, type: null, obstacleId: null };
    }

    FN.collision = { circleRect, circleCircle, checkPlayerCollision };
})(window.FN = window.FN || {});
