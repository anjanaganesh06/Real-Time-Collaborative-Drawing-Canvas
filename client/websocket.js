export default class WSClient {
  constructor(url, handlers = {}) {
    this.url = url;
    this.handlers = handlers;
    this._connect();
    this._reconnectDelay = 1000;
  }

  _connect(){
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => { this._reconnectDelay = 1000; this._emit('open') };
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this._emit(msg.type, msg);
      } catch(e){
        console.error('Bad message', e);
      }
    };
    this.ws.onclose = () => { this._emit('close'); setTimeout(()=>this._connect(), this._reconnectDelay); this._reconnectDelay = Math.min(30000, this._reconnectDelay*1.5); };
    this.ws.onerror = (e)=> console.error(e);
  }

  _emit(type, payload){ if(this.handlers[type]) this.handlers[type](payload); }

  send(type, data){
    const msg = JSON.stringify(Object.assign({type}, data));
    if(this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(msg);
  }
}
