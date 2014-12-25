var Scope = function () {
	var analyser, byteBuffer,cnv;
	var aCtx, vCtx;
	var nSamples,step,columns;
	var maxFrames = 10000;
	var scale;
	var init = function(elem,context,a){
		aCtx = context;
		cnv = elem;
		vCtx = cnv.getContext('2d');
		//analyser = context.createAnalyser();
		analyser = a;
    	analyser.fftSize = 2048;
    	byteBuffer = new Uint8Array(analyser.frequencyBinCount);
    	nSamples = analyser.frequencyBinCount;
		step = nSamples / cnv.width; // 512 = canvas width, step should be 2
		columns = 4*nSamples/step; //  4 bytes for 32-bit		
		scale = cnv.height/256
	};
	var draw = function (){
		analyser.getByteTimeDomainData(byteBuffer);
	    vCtx.beginPath();
	    vCtx.fillStyle = 'white';
	    vCtx.rect(0, 0, cnv.width, cnv.height);
	    vCtx.closePath();
	    vCtx.fill();
		vCtx.beginPath();
    	vCtx.strokeStyle = 'black';
    	vCtx.moveTo(0, cnv.height/2);
		analyser.smoothingTimeConstant = 0.1;
        for (var i=0;i<nSamples;i+=1){// just resample for now
        	value = (scale*parseInt(byteBuffer[i])) - 1 ;
        	if(--maxFrames >0 && maxFrames<100)console.log(i,value)
        	vCtx.lineTo(i,value);
        	vCtx.moveTo(i,value);
        }
        vCtx.closePath();
    	vCtx.stroke();
        window.requestAnimationFrame(draw);

	}
	var play = function(){
		vCtx.beginPath();
    	vCtx.fillStyle = 'black';
    	vCtx.rect(0, 0, cnv.width, cnv.height);
    	vCtx.closePath();
    	vCtx.fill();
    	window.requestAnimationFrame(draw);
	}
	return {
		init:init,
		play:play,
		draw:draw
	}
}