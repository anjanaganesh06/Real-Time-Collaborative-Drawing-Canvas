const {EventEmitter} = require('events');

class Room extends EventEmitter {
  constructor(name){
    super();
    this.name = name;
    this.clients = new Set();
    this.opLog = []; // {seq, op | tombstone}
    this.seq = 0;
    this.users = {};
  }

  join(client){
    this.clients.add(client);
    client.room = this.name;
    // minimal user registration
    this.users[client.id] = {id:client.id, name:client.id, color: '#' + Math.floor(Math.random()*16777215).toString(16)};
  }

  leave(client){
    this.clients.delete(client);
    delete this.users[client.id];
  }

  broadcast(msg){
    const s = JSON.stringify(msg);
    for(const c of this.clients) if(c.ws.readyState === 1) c.ws.send(s);
  }

  broadcastExcept(srcClient, msg){
    const s = JSON.stringify(msg);
    for(const c of this.clients) if(c !== srcClient && c.ws.readyState === 1) c.ws.send(s);
  }

  submitOp(op, client){
    // server adds seq and records op
    const serverOp = Object.assign({}, op, {seq: ++this.seq, origin: client.id});
    this.opLog.push(serverOp);
    // broadcast canonical op
    this.broadcast({type:'op_broadcast', op: serverOp});
    // optionally create snapshots every N ops
    if(this.seq % 200 === 0) this.createSnapshot();
  }

  // Undo semantics: mark op as tombstoned; broadcast undo
  requestUndo(opId, client){
    // allow undo from any client (global undo): server will tombstone op and broadcast
    // more advanced: restrict by permissions
    const idx = this.opLog.findIndex(o => o.opId === opId && !o.tombstone);
    if(idx === -1) return;
    this.opLog[idx].tombstone = true;
    this.broadcast({type:'undo_broadcast', opId});
  }

  requestRedo(opId, client){
    // redo means re-insert op as active: we should recall original op details
    const entry = this.opLog.find(o => o.opId === opId);
    if(!entry) return;
    if(!entry.tombstone) return;
    // create a new op re-applying same opId but new seq and tombstone=false
    // or flip tombstone - simpler: flip and broadcast
    entry.tombstone = false;
    this.broadcast({type:'redo_broadcast', op: entry});
  }

  getSnapshot(){
    // snapshot is the list of active ops (not tombstoned) — you may want to send image bytes instead for heavy logs
    return {ops: this.opLog.filter(o=>!o.tombstone).slice(-1000)};
  }

  getRecentOps(n){
    return this.opLog.slice(-n);
  }

  broadcastUserList(){
    const users = Object.values(this.users);
    this.broadcast({type:'user_list', users});
  }
}

class RoomManager {
  constructor(){
    this.rooms = new Map();
  }

  join(roomName, client){
    if(!this.rooms.has(roomName)) this.rooms.set(roomName, new Room(roomName));
    const room = this.rooms.get(roomName);
    room.join(client);
  }

  leave(roomName, client){
    const room = this.rooms.get(roomName);
    if(room) room.leave(client);
  }

  get(roomName){
    if(!this.rooms.has(roomName)) this.rooms.set(roomName, new Room(roomName));
    return this.rooms.get(roomName);
  }
}

module.exports = { RoomManager };
