export const setupSockets = (io) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Join a specific board room for real-time updates
        socket.on('join-board', (boardId) => {
            socket.join(boardId);
            console.log(`Socket ${socket.id} joined board ${boardId}`);
        });

        // Leave a board room
        socket.on('leave-board', (boardId) => {
            socket.leave(boardId);
            console.log(`Socket ${socket.id} left board ${boardId}`);
        });

        // Broadcast card movement
        socket.on('card-moved', (data) => {
            const { boardId } = data;
            console.log(`Card moved in board ${boardId}, broadcasting board-updated`);
            // Broadcast to everyone in the room EXCEPT the sender
            socket.to(boardId).emit('board-updated');
        });

        // Broadcast list update/reorder
        socket.on('list-updated', (data) => {
            const { boardId } = data;
            socket.to(boardId).emit('board-updated');
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};
