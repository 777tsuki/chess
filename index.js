const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    allowedHeaders: ["aheader"],
    credentials: true
  }
});
const redisClient = require('redis')
const redis = redisClient.createClient(6379, '127.0.0.1');
redis.connect();
/*redis.on('error', err => {
  console.log(err)
})*/

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/main.html');
});
app.get('/21p', (req, res) => {
  res.sendFile(__dirname + '/21p.html');
});
app.get('/21pm', (req, res) => {
  res.sendFile(__dirname + '/21pm.html');
});

source();
beginning();

io.on('connection', (socket) => {//这块比较乱，已经尽量在简写了（笑）
  socket.on('join', (roomid,username,type) => {
    roomid+='';
    hg(roomid,'host').then(async (host)=>{
      if (host==undefined) {//列表中某个房间突然被解散的情况
        io.in(socket.id).emit('load','unexist_room');
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
          amount(roomid);
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
          amount('list');
          let player1=await hg(roomid,'player1');
          let player2=await hg(roomid,'player2');
          let stats=await hg(roomid,'stats');
          io.in(socket.id).emit('card','member',player1,player2,stats);
        }
      }
    });
  });
});
io.on('connection', (socket) => {
  socket.on('room', (action,id,ico,name) => {
    switch (action)
    {
      case 'create':
        getid(1,socket.data.username).then(function() {
          hg('hoster',socket.data.username).then((roomId)=>{
            roomId+='';
            amount('list');
            redis.hSet(roomId,{
              'host':socket.data.username,
              'observe':id,
              'ico':ico,
              'name':name,
              'stats':'waitting',
              'nums':'1,2,3,4,5,6,7,8,9,10,11',
            });
            rg('rooms').then((value)=>{
              if (roomId>value) {
                rs('rooms',roomId);
              }
            });
            socket.data.room=roomId;
            socket.leave('list');
            socket.join(roomId);
            //io.in('list').emit('room','list',roomId,socket.data.username,1,observe,ico,name);
            io.in(socket.id).emit('room','join',roomId,'true');
            io.in(socket.id).emit('message','牌桌已创建');
            amount(roomId);
          })
        });
        break;
      case 'getlist':
        room_getlist(socket.id);
        break;
      case 'close':
        redis.del(id);
        redis.hDel('hoster',ico);
        io.to(id).emit('room','close');
    }
  });
  socket.on('card',async (action)=>{
    switch (action) {
      case 'join':
        card_join(socket.data.room,socket.data.username,socket.id);
        break;
      case 'accept':
        let a = await card_add(socket.data.room);
        let stats = await hg(socket.data.room,'stats');
        let player1 = await hg(socket.data.room,'player1');
        let player2 = await hg(socket.data.room,'player2');
        io.in(socket.data.room).emit('card','accept',player1,player2,a,stats);
        redis.hSet(socket.data.room,'stats',(stats=='1')?'2':'1');
        break;
      case 'refuse':

        break;
    }
  })
  socket.on('message', (msg) => {
    io.in(socket.data.room).emit('message',socket.data.username+" : "+msg);
  });
  socket.on('load', (msg) => {
    if (msg=='loading') {
      io.in(socket.id).emit('load','finish');
    }
  });
});
io.use((socket, next) => {
  setTimeout(() => {
    next(/*console.log(6)*/);
  }, 1);
  socket.on('disconnect', () => {
    if (socket.data.room!=undefined) {
      amount(socket.data.room);
      socket.leave(socket.data.room);
    }
  });
});

server.listen(2053, () => {
  console.log('listening on *:2053');
});

function source() {
  app.get('/psc', (req, res) => {
    const num=Math.round(Math.random()*5);//0开始，十个图，前六小，后四大
    res.sendFile(__dirname + '/psc/psc/psc ('+num+').webp');
  });
  app.use('/source', express.static('psc'));
}
function beginning() {
  io.emit('some event', { someProperty: 'some value', otherProperty: 'other value' });
  redis.hSet('list',{
    'host':'host',
  });
  redis.hSet('main',{
    'host':'host',
  });
  redis.setNX('rooms','0');
}
function room_getlist(userid) {
  rg('rooms').then(async (value)=>{
    for (var i=1;i<=value;i++){
      i+='';
      await hg(i,'host').then(async (host)=>{
        if (host!=undefined) {
          let amount=await io.in(i).fetchSockets();
          let observe=await hg(i,'observe');
          let ico=await hg(i,'ico');
          let name=await hg(i,'name');
          io.in(userid).emit('room','list',i,host,amount.length,observe,ico,name);
        }
      });
    }
  });
}
async function getid(id,username) {
  var result=[];
  await rg('rooms').then(async (value)=>{
    while (id<=value+1) {
      await hg(id+'','host').then((host)=>{
        id=Number(id);
        if (host==undefined) {
          result.push(id);
        }
      });
      id++;
    }
  })
  await redis.hSet('hoster',username,result[0]);
}
async function card_join(room,name,id) {
  room+='';
  var player1=await hg(room,'player1');
  var player2=await hg(room,'player2');
  if (player2==undefined) {
    if (player1==undefined) {
      await redis.hSet(room,'player1',name);
      io.to(room).except(id).emit('card','join',name);
    }
    else {
      let nn=Math.round(Math.random()+1);
      let observe=await hg(room,'observe');
      await redis.hSet(room,{
        'player2':name,
        'stats':nn,
      });
      let a1=await card_add(room);
      let b1=await card_add(room);
      let a2=await card_add(room);
      let b2=await card_add(room);
      io.in(room).emit('card','start',player1,name,observe,nn,a1,b1,a2,b2);
    }
  }
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
async function amount(room) {
  let sockets = await io.in(room).fetchSockets();
  io.in(room).emit('number',sockets.length);
}
async function card_add(room) {
  let value=await hg(room,'nums');
  let result=value.split(',');
  let i=Math.round(Math.random()*(result.length-1));
  let a=result[i];
  result.splice(i,1);
  result=result.toString();
  await redis.hSet(room,'nums',result);
  return a;
}
/*async function asyncCall() {
  await redis.set('key','value')
  let value = await redis.get('key')
  console.log(value)
  let num = await redis.del('key')
  console.log(num)
  await redis.quit()
}*/