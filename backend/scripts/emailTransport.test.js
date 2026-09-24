const {test}=require('node:test');
const assert=require('node:assert/strict');
const net=require('node:net');
const {sendNotificationEmail,detailUrl}=require('../services/emailService');
test('recipient uses resident contact email, trims whitespace and falls back to account email',()=>{
 const {recipientEmail}=require('../services/emailService');
 assert.equal(recipientEmail({ResidentEmail:' resident@example.invalid ',AccountEmail:'account@example.invalid'}),'resident@example.invalid');
 assert.equal(recipientEmail({ResidentEmail:'invalid',AccountEmail:' account@example.invalid '}),'account@example.invalid');
 assert.equal(recipientEmail({ResidentEmail:null,AccountEmail:'invalid'}),null);
});
test('delivery errors explain failures without exposing SMTP responses or credentials',()=>{
 const {deliveryError}=require('../services/emailService');
 assert.equal(deliveryError({code:'EAUTH',message:'secret'}).code,'EAUTH');
 assert(!deliveryError({code:'EAUTH',message:'secret'}).message.includes('secret'));
 assert.equal(deliveryError({code:'UNKNOWN',message:'secret'}).code,'SMTP_SEND_FAILED');
});
test('SMTP sends Vietnamese notification with safe link and reports rejected recipient',async()=>{
 const messages=[];
 const server=net.createServer(socket=>{
  socket.setEncoding('utf8');socket.write('220 localhost test SMTP\r\n');let buffer='',data=false,message='';
  socket.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+2);
   if(data){if(line==='.') {messages.push(message);message='';data=false;socket.write('250 queued\r\n');} else message+=line+'\r\n';continue;}
   if(/^EHLO|^HELO/.test(line))socket.write('250 localhost\r\n');
   else if(/^RCPT TO:.*reject/.test(line))socket.write('550 rejected\r\n');
   else if(line==='DATA'){data=true;socket.write('354 send data\r\n');}
   else if(line==='QUIT'){socket.end('221 bye\r\n');}
   else socket.write('250 ok\r\n');
  }});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const values={SMTP_HOST:'127.0.0.1',SMTP_PORT:String(server.address().port),SMTP_SECURE:'false',SMTP_USER:'',SMTP_PASS:'',SMTP_FROM_EMAIL:'tower@example.invalid',SMTP_FROM_NAME:'Đức Vũ Tower',FRONTEND_BASE_URL:'https://tower.example.invalid'};
 const old=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);
 try{
  const notification={title:'Thông báo thử',content:'Xin chào cư dân <script>alert(1)</script>',entityType:'Invoice',entityId:88,targetPage:'fees'};
  assert.equal(detailUrl(notification),'https://tower.example.invalid/?page=fees&invoiceId=88');
  assert.equal(detailUrl({actionUrl:'https://evil.invalid'}),null);
  const receipt=await sendNotificationEmail('recipient@example.invalid',notification);assert.equal(messages.length,1);
  assert.match(receipt.messageId,/^<.+@.+>$/);
  assert.equal(receipt.response,'250 queued');
  assert(messages[0].includes(receipt.messageId));
  assert.match(messages[0],/Content-Type: text\/html; charset=utf-8/i);assert(!messages[0].split('Content-Type: text/html')[1].includes('<script>'));
  await assert.rejects(sendNotificationEmail('reject@example.invalid',notification));
 }finally{for(const [key,value] of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}await new Promise(resolve=>server.close(resolve));}
});
