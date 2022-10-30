const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const redisClient = require('redis')
const redis = redisClient.createClient(6379, '127.0.0.1');
redis.connect()
/*redis.on('error', err => {
  console.log(err)
})*/

/*rs('key','value');
rg('key').then((res)=>{console.log(res)});
rd('key');*/

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/main.html');
});
app.get('/21p', (req, res) => {
  res.sendFile(__dirname + '/21p.html');
});

io.emit('some event', { someProperty: 'some value', otherProperty: 'other value' });

redis.hSetNX('main','host','host','amount','0');
redis.hSetNX('list','host','host','amount','0');
redis.setNX('rooms','0');
hg('main','amount').then((res)=>{console.log(res)});

//rooms={'main':['host',0],'list':['host',0]};
//var info={'user':'roomid'};
var roomId=1;

io.on('connection', (socket) => {//这块比较乱，已经尽量在简写了（笑）
  socket.on('join', (roomid,username,type) => {
    hg(roomid,'host').then((host)=>{
      if (host==undefined) {//列表中某个房间突然被解散的情况
        io.in(socket.id).emit('reload','unexist_room');
      }
      else {
        socket.data.username=username;
        if (roomid!='none')
        {
          if (socket.data.room!=undefined) {//防崩
            socket.leave(socket.data.room);
          }
          socket.join(roomid);
          socket.data.room=roomid;
          amount(roomid,'add');
          if (host==username) {//区分是不是房主
            io.in(socket.id).emit('room','join',roomid,'true');
          }
          else {
            io.in(socket.id).emit('room','join',roomid,'false');
          }
        }
        if (roomid!='list') {//房间列表，只有在这个界面没有聊天室功能
          io.in(roomid).emit('message',username+'进来了');
        }
        else {
          hg('hoster',username).then((ownroom)=>{
            if (ownroom!=undefined) {//已经建过房间的情况
              io.in(socket.id).emit('room','exist',ownroom);
            }
          });
        }
        if (type!='normal') {//进入专房等于离开房间列表，人数减一
          amount('list','reduce');
        }
      }
    });
  });
});
io.on('connection', (socket) => {
  socket.on('room', (action,id) => {
    switch (action)
    {
      case 'create':
        for (let i=1;i>-10;i++) {
          hg(i,'host').then((host)=>{
            if (host==undefined) {
              roomId=i;
              i=-100;
            }
          });
        };
        amount('list','reduce');
        redis.hSet(roomId,'host',socket.data.username,'amount','1');
        redis.hSet('hoster',socket.data.username,roomId);
        rg('rooms').then((value)=>{
          if (roomId>value) {
            rs('rooms',value);
          }
        });
        socket.data.room=roomId;
        socket.leave('list');
        socket.join(roomId);
        io.in(socket.id).emit('room','create',roomId);
        io.in('list').emit('room','list',roomId,socket.data.username,1);
        io.in(socket.id).emit('room','join',roomId,'true');
        break;
      case 'getlist':
        room_getlist();
        break;
      case 'close':
        room_close(id);
    }
  });
  socket.on('message', (msg) => {
    io.in(socket.data.room).emit('message',socket.data.username+" : "+msg);
  });
});
io.use((socket, next) => {
  setTimeout(() => {
    next(/*console.log(6)*/);
  }, 1);
  socket.on('disconnect', () => {
    if (socket.data.room!=undefined) {
      amount(socket.data.room,'reduce')
      socket.leave(socket.data.room);
    }
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

async function room_getlist() {
  await rg('rooms').then((value)=>{
    for (let i=1;i<value+1;i++){
      hg(i,'host').then((host)=>{
        if (host!=undefined) {
          hg(i,'amount').then((value)=>{
            io.in(socket.id).emit('room','list',i,host,value);
          });
        }
      });
    }
  });
}
async function room_close(id) {
  id=Number(id);
  io.to(id).emit('room','close');
  await redis.hDel(id);
  await redis.hDel('hoster',socket.data.username);
}

async function rs(key,value) {
  await redis.set(key,value);
}
async function rg(key) {
  let value = await redis.get(key);
  return value;
}
async function rd(key) {
  await redis.del('key');
}
async function hg(key,field) {
  let value = await redis.hGet(key,field);
  return value;
}
function amount(room,action) {
  hg(room,'amount').then((amount)=>{
    if (action=='add') {
      redis.hSet(room,'amount',++amount);
      io.in(room).emit('number',amount);
    }
    else {
      redis.hSet(room,'amount',--amount);
      io.in(room).emit('number',amount);
    }
  });
}
/*function rg(key) {
  new Promise(
    async function (resolve, reject) {
      let value = await redis.get(key);
      resolve(value);
    }
  ).then((value)=>{
    console.log(value);
  })
}*/
/*async function asyncCall() {
  await redis.set('key','value')
  let value = await redis.get('key')
  console.log(value)
  let num = await redis.del('key')
  console.log(num)
  await redis.quit()
}*/