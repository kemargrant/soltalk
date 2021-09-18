function createCommands(){
	if(window.location.host.search("local") < 0){
		return;
	}
	let t1 = ["attack","gaurd","counter","taunt","idle","dead"];
	let outcomes = []
	for(let i = 0;i < t1.length;i++){
		for(let j = 0;j < t1.length;j++){
			outcomes.push(t1[i] + "-"+t1[j])
		}
	}
	let div =  document.createElement("div");
	div.setAttribute("style","border:2px solid black;position:absolute;");
	const bc = new BroadcastChannel('game_commands');
	outcomes.map((item,i)=>{
			let button = document.createElement("button");
			button.innerHTML = item;
			button.onclick =()=>{
				bc.postMessage(item);
			}
			div.appendChild(button);
	});
	document.body.prepend(div);		
}

function createSphere(a,b,c,color,THREE){
	let geometry = new THREE.SphereGeometry( a,b,c );
	let material = new THREE.MeshBasicMaterial( {color} );
	return new THREE.Mesh( geometry, material );
}

let p1Outline = []

function routline(p1,color,root,scene,THREE){
	if(root.children[0]){
		let sphere;
		if(p1){
			sphere = createSphere(5,5,5,color,THREE);
			p1Outline.unshift({
				sphere,
				obj:root.children[0]
			});
			console.log(root.children[0]);
			scene.add(sphere);
		}
		return routline(p1,color,root.children[0],scene,THREE);
	}
}

function trackHips(){
	if(p1Outline.length > 1){
		for(let i = 0;i < p1Outline.length;i++){
			p1Outline[i].sphere.position.set( p1Outline[i].obj.position.x,p1Outline[i].obj.position.y,p1Outline[i].obj.position.z)
		}
	}
}

function trackSphere(hips1,hips2,p1sphere,p2sphere){
	return new Promise((resolve,reject)=>{
		if(hips1){p1sphere.position.set(hips1.x,hips1.y,hips1.z);}
		if(hips2){p2sphere.position.set(hips2.x,hips2.y,hips2.z);}
		return resolve(true);
	});
}
		
let sample;
let maxNeg = 0;
let maxPos= 0;
let prevDiff;
let p1Speed;
let p2Speed;
let p2Accel;
let p1Accel;
let p1z = [];
let p2z = [];
let p1v = [];
let p2v = [];
let ds = 0;

function checkCollision(p1sphere,p2sphere) {
	return new Promise((resolve,reject)=>{
		let diff = p1sphere.position.z-p2sphere.position.z;
		p1z.unshift(p1sphere.position.z);
		p2z.unshift(p2sphere.position.z);
		if(p2z.length > 2){
			p1Speed = Math.abs(p1z[1] - p1z[0]);
			p2Speed = Math.abs(p2z[1] - p2z[0]);
			p1v.unshift(p1Speed);
			p2v.unshift(p2Speed);
			p2z.pop();
			p1z.pop()
		}
		if(p2v.length > 2){
			p1Accel = Math.abs(p1v[1] - p1v[0]);
			p2Accel = Math.abs(p2v[1] - p2v[0]);
			p1v.pop();
			p2v.pop();
		}
		return resolve({func:null});
	});
}

let captureStream;
let recordedChunks = [];
let recordTimeout = null;
let recordInterval = null;
async function requestDesktop(){
	captureStream = null;
	try {
		captureStream = await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
	} 
	catch(err) {
		console.error("Error: " + err);
	}
	return captureStream;
}
function stopCapture() {
  let tracks = captureStream.getTracks();
  tracks.forEach(track => track.stop());
}
async function Record(){
	function download(type) {
	  var blob = new Blob(recordedChunks, {type:""});
	  var url = URL.createObjectURL(blob);
	  var a = document.createElement("a");
	  document.body.appendChild(a);
	  a.style = "display: none";
	  a.href = url;
	  a.download = "sol-survivor.mp4";
	  a.click();
	  window.URL.revokeObjectURL(url);
	  stopCapture();
	  clearTimeout(recordTimeout);
	  clearInterval(recordInterval);
	  recordTimeout = null;
	  recordInterval = null;
	  recordedChunks = [];
	}	
	function handleDataAvailable(event) {
	  if (event.data.size > 0) {return recordedChunks.push(event.data);} 
	}
	if(recordedChunks.length > 0 ){
		return download();
	}
	let options = { mimeType:'video/mp4; codecs="avc1.424028, mp4a.40.2"' };
	let recordButton = document.getElementById("recordButton");
	let recordTime = 22000;
	let timer = 0;
	//~ let canvas = document.getElementsByTagName("canvas")[0];
	//~ let stream = canvas.captureStream(30);
	let stream = await requestDesktop();
	let mediaRecorder = new MediaRecorder(stream);
	mediaRecorder.ondataavailable = handleDataAvailable;
	mediaRecorder.start(250);
	recordTimeout = setTimeout(()=>{
		download(options.mimeType);
		mediaRecorder.stop();
		recordButton.innerHTML = `Record`;
	},recordTime);
	recordInterval = setInterval(()=>{
		recordButton.innerHTML = `Stop ${(recordTime/1000) - timer - 2}s`;
		timer++;
	},1000);
}
let images = 0;
let recordButton = 0;
async function Record2(){
	let seconds = 2;
	let fps = 30;
	let canvas = document.getElementsByTagName("canvas")[0];		
	function download(i,dataURL) {
	  let url = canvas.toDataURL("image/png");	
	  let a = document.createElement("a");
	  document.body.appendChild(a);
	  a.style = "display: none";
	  a.href = url;
	  a.download = i+".png";
	  a.click();
	  //window.URL.revokeObjectURL(dataURL);
	}
	if(images > fps * seconds){return}
	if(recordButton === 0){
		recordButton = 1;
		let button = document.createElement("button");
		button.innerHTML = "record";
		button.style = "position:absolute;bottom:10vh;"
		document.body.appendChild(button);
		button.onclick = ()=>{ recordButton = 2; images = 0; }
	}
	if(recordButton === 2){ await download(images++);	 }	
}


function rotateCamera(camera){
	camera.position.applyQuaternion( new THREE.Quaternion().setFromAxisAngle(
		new THREE.Vector3( 0, 1, 0 ),
		0.15
	));
	camera.lookAt( 0,0,0 );
}

export default { createCommands,createSphere,routline,trackSphere,Record,Record2 }
