const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { RoomManager } = require('./room');

const app = express();
app.use(express.static('client'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
const rooms = new RoomManager();

server.on('upgrade', (req, socket, head) => {
  if(req.url.startsWith('/ws')){
    wss.handleUpgrade(req, socket, head, (ws) => {
      const client = { ws, id: generateId(), room: 'default' };
      rooms.join('default', client);
      setupClient(ws, client);
    });
  } else {
    socket.destroy();
  }
});

function generateId(){ return 'c_' + Math.random().toString(36).slice(2,9); }

function setupClient(ws, client){
  ws.on('message', (raw) => {
    let msg;
    try{ msg = JSON.parse(raw); } catch(e){ return; }
    const type = msg.type;
    const room = rooms.get(client.room);
    switch(type){
      case 'client_op':
        // client finished stroke op -> process authoritative op
        // msg.op is the op (has opId, meta, points)
        room.submitOp(msg.op, client);
        break;
      case 'stroke_chunk':
        // lightweight streaming chunks can be forwarded to others for optimistic rendering
        room.broadcastExcept(client, {type:'stroke_chunk', from:client.id, points: msg.points});
        break;
      case 'cursor':
        room.broadcastExcept(client, {type:'cursor', from:client.id, x:msg.x, y:msg.y});
        break;
      case 'undo':
        room.requestUndo(msg.opId, client);
        break;
      case 'redo':
        room.requestRedo(msg.opId, client);
        break;
      default:
        console.log('unknown', type);
    }
  });

  // send welcome + snapshot
  const room = rooms.get(client.room);
  ws.send(JSON.stringify({type:'welcome', clientId: client.id, snapshot: room.getSnapshot(), ops: room.getRecentOps(50)}));
  // broadcast presence
  room.broadcastUserList();
  ws.on('close', ()=> {
    rooms.leave(client.room, client);
    room.broadcastUserList();
  });
}

server.listen(3000, ()=> console.log('Listening on :3000'));
