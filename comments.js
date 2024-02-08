// Create web server
var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var comments = require('./comments.js');

var server = http.createServer(function(req, res) {
  var urlPath = url.parse(req.url).pathname;
  var filePath = path.join(__dirname, urlPath);

  // If the file is not found, return a 404 error
  fs.stat(filePath, function(err, fileInfo) {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      }
      return;
    }

    if (fileInfo.isFile()) {
      var mimeType = {
        '.ico': 'image/x-icon',
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword'
      };
      var ext = path.parse(filePath).ext;
      res.setHeader('Content-type', mimeType[ext] || 'text/plain');
      fs.createReadStream(filePath).pipe(res);
    } else if (fileInfo.isDirectory()) {
      res.writeHead(302, {
        Location: 'index.html'
      });
      res.end();
    }
  });
});

// Socket.io server listens to our app
var io = require('socket.io').listen(server);

// Send current comments to the user
function sendComments(socket) {
  comments.getComments(function(err, data) {
    if (err) {
      console.error(err);
      return;
    }

    socket.emit('comments', data);
  });
}

// Listen to the connection event for new incoming sockets
io.sockets.on('connection', function(socket) {
  sendComments(socket);

  // Listen to the comment event
  socket.on('comment', function(comment) {
    comments.addComment(comment, function(err) {
      if (err) {
        console.error(err);
        return;
      }

      // Send the new comment to all users
      io.sockets.emit('comment', comment);
    });
  });
});

// Start the web server
server.listen(3000)