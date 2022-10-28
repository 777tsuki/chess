const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/main.html');
});
app.get('/21p', (req, res) => {
  res.sendFile(__dirname + '/21p.html');
});

io.emit('some event', { someProperty: 'some value', otherProperty: 'other value' });

rooms={'main':['host',0],'list':['host',0]};
var info={'user':'roomid'};
var roomId=1;

io.on('connection', (socket) => {//这块比较乱，已经尽量在简写了（笑）
  socket.on('join', (roomid,username,type) => {
    if (rooms[roomid][0]==undefined) {//列表中某个房间突然被解散的情况
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
        io.in(roomid).emit('number','normal',(++rooms[roomid][1]));
        if (roomid==info[socket.data.username]) {//区分是不是房主
          io.in(socket.id).emit('room','join',roomid,'true');
        }
        else {
          io.in(socket.id).emit('room','join',roomid,'false');
        }
      }
      if (roomid!='list') {//房间列表，只有在这个界面没有聊天室功能
        io.in(socket.data.room).emit('message',socket.data.username+'进来了');
      }
      else {
        if (info[socket.data.username]!=undefined) {
          io.in(socket.id).emit('room','exist',info[socket.data.username]);
        }
      }
      if (type!='normal') {//进入专房等于离开房间列表，人数减一
        io.in('list').emit('number','normal',(--rooms['list'][1]));
      }
    }
  });
});
io.on('connection', (socket) => {
  socket.on('room', (action,id) => {
    switch (action)
    {
      case 'create':
        for (var i=1;i>-10;i++) {
          if (rooms[i]==undefined) {
            roomId=i;
            i=-100;
          }
          else if (rooms[i][0]==undefined) {
            roomId=i;
            i=-100;
          }
        };
        io.in('list').emit('number','normal',(--rooms[socket.data.room][1]));
        rooms[roomId]=[socket.data.username,1];
        info[socket.data.username]=roomId;
        socket.data.room=roomId;
        socket.leave('list');
        socket.join(roomId);
        io.in(socket.id).emit('room','create',roomId);
        io.in('list').emit('room','list',roomId,socket.data.username,1);
        io.in(socket.id).emit('room','join',roomId,'true');
        io.in(roomId).emit('number','normal',(roomId++));
        break;
      case 'getlist':
        for (var i=1;i<Object.keys(rooms).length-1;i++){
          if (rooms[i][0]!=undefined) {
            io.in(socket.id).emit('room','list',i,rooms[i][0],rooms[i][1]);
          }
        }
        break;
      case 'close':
        id=Number(id);
        io.to(id).emit('room','close');
        rooms[id][0]=undefined;
        rooms[id][1]=1;
        info[socket.data.username]=undefined;
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
      io.in(socket.data.room).emit('number','normal',(--rooms[socket.data.room][1]));
      socket.leave(socket.data.room);
    }
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});