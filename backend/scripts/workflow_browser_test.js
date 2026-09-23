// Headless Chrome through its DevTools protocol; no browser dependencies required.
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
module.exports=async function browserTest({base,users}){
 const tempRoot=path.resolve(os.tmpdir()),profile=fs.mkdtempSync(path.join(tempRoot,'condo-ui-'));
 const chrome=spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--window-size=1440,1000','about:blank'
 ],{windowsHide:true,stdio:'ignore'});
 chrome.on('error',error=>console.error('CHROME START ERROR:',error.message));
 let ws;const report=[],issues=[];
 try{
  const portFile=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<100&&!fs.existsSync(portFile);i++)await sleep(100);
  assert(fs.existsSync(portFile),'Chrome failed to start');
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
  const tab=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let seq=0;const waiting=new Map();let context='boot';
  ws.onmessage=event=>{
   const message=JSON.parse(event.data);
   if(message.id){const promise=waiting.get(message.id);waiting.delete(message.id);message.error?promise?.reject(message.error):promise?.resolve(message.result);}
   if(message.method==='Runtime.exceptionThrown')issues.push({context,exception:message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text});
   if(message.method==='Network.responseReceived'&&message.params.response.status>=400&&message.params.response.url.includes('/api/'))issues.push({context,status:message.params.response.status,url:message.params.response.url.replace(base,'')});
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{waiting.delete(id);reject(new Error(`CDP timeout: ${context} ${method}`));},15000);waiting.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async(expression)=>{
   const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});
   if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
   return result.result.value;
  };
  const waitFor=async(expression,label)=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(100);}throw new Error(`Timed out: ${context} ${label}`);};
  const click=async(label,selector='button')=>{
   const found=await evaluate(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(selector)})].find(b=>b.offsetWidth&&b.textContent.trim()===${JSON.stringify(label)});if(!b)return false;b.click();return true;})()`);
   assert(found,`${context}: button missing: ${label}`);await sleep(300);
  };
  const text=()=>evaluate('document.body.innerText');
  const fill=async(selector,value)=>{await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)throw new Error('Input missing');Object.getOwnPropertyDescriptor(input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(String(value))});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await sleep(250);};
  const browserTicket=`Browser equipment ${Date.now()}`;
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  const downloads=path.join(profile,'downloads');fs.mkdirSync(downloads);
  await send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:base});await waitFor('!!document.querySelector("input")','login');
  const menus={
   RESIDENT:['Bảng tổng quan','Hồ sơ cư dân','Căn hộ của tôi','Hợp đồng của tôi','Hóa đơn & thu phí','Phương tiện của tôi','Thẻ xe','Lịch sử ra vào','Phòng Gym','Hồ bơi','Dịch vụ Wi-Fi','Yêu cầu hỗ trợ','Phản ánh của tôi','Thông báo','Hồ sơ cá nhân','Đổi mật khẩu'],
   TECHNICIAN:['Bảng tổng quan','Yêu cầu hỗ trợ','Xử lý bảo trì','Lịch bảo trì','Thông báo','Hồ sơ cá nhân','Đổi mật khẩu'],
   ACCOUNTANT:['Bảng tổng quan','Cư dân','Căn hộ & tòa nhà','Hợp đồng thuê','Hóa đơn & thu phí','Phòng Gym','Hồ bơi','Dịch vụ Wi-Fi','Thông báo','Doanh thu','Công nợ','Căn hộ','Dịch vụ','Hồ sơ cá nhân','Đổi mật khẩu'],
   MANAGER:['Bảng tổng quan','Cư dân','Căn hộ & tòa nhà','Hợp đồng thuê','Hóa đơn & thu phí','Xe cư dân','Thẻ xe','Vị trí đỗ xe','Lịch sử ra vào','Phòng Gym','Hồ bơi','Dịch vụ Wi-Fi','Yêu cầu hỗ trợ','Xử lý bảo trì','Phản ánh cư dân','Lịch bảo trì','Thông báo','Gửi thông báo','Lịch gửi','Người dùng','Doanh thu','Công nợ','Căn hộ','Dịch vụ','Hồ sơ cá nhân','Đổi mật khẩu'],
   RECEPTION:['Cư dân','Căn hộ & tòa nhà','Hợp đồng thuê','Hóa đơn & thu phí','Xe cư dân','Thẻ xe','Vị trí đỗ xe','Lịch sử ra vào','Yêu cầu hỗ trợ','Phản ánh cư dân','Thông báo','Hồ sơ cá nhân','Đổi mật khẩu'],
   SECURITY:['Xe cư dân','Thẻ xe','Vị trí đỗ xe','Lịch sử ra vào','Thông báo','Hồ sơ cá nhân','Đổi mật khẩu'],
   ADMIN:['Bảng tổng quan','Cư dân','Căn hộ & tòa nhà','Hợp đồng thuê','Hóa đơn & thu phí','Xe cư dân','Thẻ xe','Vị trí đỗ xe','Lịch sử ra vào','Phòng Gym','Hồ bơi','Dịch vụ Wi-Fi','Yêu cầu hỗ trợ','Xử lý bảo trì','Phản ánh cư dân','Lịch bảo trì','Thiết bị','Thông báo','Gửi thông báo','Lịch gửi','Người dùng','Vai trò','Phân quyền','Nhật ký hệ thống','Doanh thu','Công nợ','Căn hộ','Dịch vụ','Hồ sơ cá nhân','Đổi mật khẩu','Thông tin hệ thống']
  };
  for(const [role,pages] of Object.entries(menus)){
   if(process.env.BROWSER_ROLES&&!process.env.BROWSER_ROLES.split(',').includes(role))continue;
   context=role;
   console.log('BROWSER ROLE',role);
   await evaluate(`localStorage.clear();localStorage.setItem('token',${JSON.stringify(users[role])});`);
   await send('Page.reload');await waitFor('!!document.querySelector("aside nav")','session restore');await sleep(300);
   assert(!(await text()).includes('Báo cáo nhanh'),`${role}: removed quick report appeared`);
   for(const page of pages){
    context=`${role}: ${page}`;
    console.log('BROWSER PAGE',context);
    await click(page,'aside nav button.group');await sleep(350);
    const body=await text();assert(body.length>100,`${context}: blank screen`);
    if(role==='RESIDENT'){
     const labels=await evaluate('[...document.querySelectorAll("main button")].map(x=>x.textContent.trim())');
     for(const forbidden of ['Nhận xử lý','Hoàn tất','Thêm căn hộ','Thêm tòa nhà','Xác nhận thanh toán','Phản hồi'])assert(!labels.includes(forbidden),`${context}: forbidden button ${forbidden}`);
    }
    if(page==='Hồ sơ cá nhân'){await click('Chỉnh sửa');await click('Hủy');}
    if(page==='Yêu cầu hỗ trợ'&&role==='RESIDENT'){await click('Gửi yêu cầu');await waitFor('!!document.querySelector("form select")','ticket form');await click('Hủy');}
    if(page==='Căn hộ của tôi'){await click('Xem chi tiết');assert((await text()).includes('Thiết bị'));await click('Đóng');await click('Xem thiết bị');assert((await text()).includes('Báo hỏng / Bảo trì'));await click('Báo hỏng / Bảo trì');await fill('form input',browserTicket);await fill('form textarea','Device failure from resident browser test');await click('Gửi yêu cầu','form button');await waitFor("document.body.innerText.includes('Đã gửi yêu cầu.')",'equipment ticket saved');await click('Đóng');
     // Shared Modal has an icon close button; use its visible fixed overlay fallback.
     await evaluate('(()=>{const modal=document.querySelector(".fixed.inset-0.z-50");if(modal){const buttons=[...modal.querySelectorAll("button")];buttons.find(b=>!b.textContent.trim())?.click();}})()');
    }
    if(page==='Phản ánh của tôi'){await click('Gửi phản ánh');await click('Hủy');}
    if(page==='Yêu cầu hỗ trợ'&&role==='TECHNICIAN'){
     await fill('input[placeholder="Tìm yêu cầu…"]',browserTicket);await waitFor(`document.body.innerText.includes(${JSON.stringify(browserTicket)})`,'resident ticket visible');
     await click('Nhận xử lý');await waitFor("!Array.from(document.querySelectorAll('main button')).some(b=>b.textContent.trim()==='Nhận xử lý')",'ticket accepted');await click('Xem chi tiết');
     await waitFor('!!document.querySelector("form input[type=number]")','progress form');await fill('form input[type=number]',50);await fill('form textarea','Browser progress update');await click('Cập nhật tiến độ');
     await waitFor("document.body.innerText.includes('Tiến độ: 50%')",'progress saved');await click('Hoàn tất');await waitFor("document.body.innerText.includes('Tiến độ: 100%')",'ticket completed');await click('Đóng');
    }
    if(page==='Công nợ'){
     const before=fs.readdirSync(downloads);await click('Xuất báo cáo');
     let file;for(let i=0;i<50&&!file;i++){await sleep(100);file=fs.readdirSync(downloads).find(f=>f.endsWith('.xlsx')&&!before.includes(f));}
     assert(file,`${context}: Excel download missing`);
     const xlsx=require('xlsx'),workbook=xlsx.readFile(path.join(downloads,file)),sheet=workbook.Sheets[workbook.SheetNames[0]],rows=xlsx.utils.sheet_to_json(sheet);
     assert(rows.some(row=>row['Còn nợ']===45678));assert(rows.every(row=>typeof row['Tổng tiền']==='number'&&typeof row['Đã thanh toán']==='number'&&typeof row['Còn nợ']==='number'));
     fs.unlinkSync(path.join(downloads,file));
    }
    if(page==='Thông tin hệ thống'){await waitFor("document.body.innerText.includes('Thống kê dữ liệu')",'system info data');await send('Page.reload');await waitFor('!!document.querySelector("aside nav")','system reload');await click(page,'aside nav button.group');await waitFor("document.body.innerText.includes('Thống kê dữ liệu')",'system info reload');}
    report.push({role,page});
   }
  }
  console.log(JSON.stringify({browserPages:report.length,browserIssues:issues,report},null,2));
  assert.equal(issues.length,0,`Browser/API errors: ${JSON.stringify(issues)}`);
 }catch(error){console.error('BROWSER ISSUES',JSON.stringify(issues));throw error;}finally{
  if(ws&&ws.readyState===WebSocket.OPEN)ws.close();chrome.kill();
  await sleep(500);
  // Only remove the exact temporary profile created above, contained under the OS temp directory.
  if(path.dirname(path.resolve(profile))===tempRoot&&path.basename(profile).startsWith('condo-ui-'))fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
};
