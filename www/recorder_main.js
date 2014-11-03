
function floatTo16BitPCM(output, offset, input){
  for (var i = 0; i < input.length; i++, offset+=2){
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string){
  for (var i = 0; i < string.length; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}


var FreesoundRecorder = function(){
    var audioContext = new AudioContext();
    var audioInput = null,
    inputPoint = null,
    recorder = null,
    analyser = null;
    
    var bufs = [];
    var currentBuffer;
    var currentCanvs;
    var player;
    var sending;
    
    var  gotStream = function (stream) {
            console.log("got stream");
            inputPoint = audioContext.createGain();
            audioInput = audioContext.createMediaStreamSource(stream);
            audioInput.connect(inputPoint);
            recorder = new Recorder( inputPoint );
            analyser = audioContext.createAnalyser();
            audioInput.connect(analyser);
            //this.detectClipping();
    };
    
    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if(!navigator.getUserMedia){
        showMessage("Your borwser does not support recording. Try a recent version of Chrome ...");
    }
    else{
        console.log("getting media");
        navigator.getUserMedia({audio:true}, 
            gotStream, function(err) {console.log(err)}
        );
    }
    return {         
        recordingDone:function (buffers){    
            console.log("recording done");
            console.log(buffers);
            
            recorder.exportWAV(function(blob) {
            var fname = "tmp.wav";
            var fd = new FormData();                
            fd.append('audiofile', blob,fname);
            console.log(blob);    
            console.log("posting");
            var request = new XMLHttpRequest();
            request.onreadystatechange=function() {
                if (request.readyState==4) {
                    $("#results").empty();
                    console.log(request.responseText);
                    $("#results").html(request.responseText);
                }
            }
            request.open("POST", "query");
            request.send(fd);
            /*    
            $.ajax({
                url : "query",
                type: 'POST',                
                data: fd,                
                processData: false,
                mimeType: 'multipart/form-data',
                //contentType: 'multipart/form-data'
            }).done(function(response) {
                alert(response);
            });    */
                
                
            //$.post("/", fd ).done(function( data ) {
            //    console.log("post done");
            //});
            //var blob = new Blob([self.encodeWAV()], { type: "audio/wav" });


            });
            //window.uploader = new FreesoundUploader(buffers[0]);
        },
        detectClipping:function(){
            var button = $("#rec_button")[0];    
            setInterval(function(){
                if(button.classList.contains("recording")){
                    var data = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteTimeDomainData(data);

                    var clipped = false;
                    for (var i = 0;i<data.length;i++){
                        if(data[i]>248 || data[i]<8)clipped=true;
                    }
                    if(clipped)
                        button.classList.add("clipping");
                    else
                        button.classList.remove("clipping");
                };
            },200);
        },
        toggleRecording:function ( e ) {           
            if (e.classList.contains("btn-danger")) {
                recorder.stop();
                e.classList.remove("btn-danger");      
                recorder.getBuffer( this.recordingDone );
            } else {
                if (!recorder){
                    showMessage("Please allow me to use the microphone");
                    return;
                }
               
                e.classList.add("btn-danger");                
                recorder.clear();
                recorder.record();
            }
        } 
    }
};

var FreesoundUploader = function(buf){
    var self = this;
    var buffer = buf;
    var panel = $("#uploadForm");
    var canvas = $("#recorded_sound_display")[0];
    var slider = $("#selection_range");
    var audioContext = new AudioContext();
    var player = null;
    var loop=false;
    var play_class = "btn-success";

    self.drawBuffer = function() {
            var step = Math.ceil( buffer.length / canvas.width );
            var amp = canvas.height / 2;
            var ctx=canvas.getContext("2d");
            ctx.clearRect ( 0 , 0 , canvas.width ,canvas.height );
            ctx.fillStyle = "silver";
            for(var i=0; i < canvas.width; i++){
                var min = 1.0;
                var max = -1.0;
                for (j=0; j<step; j++) {
                    var datum = buffer[(i*step)+j]; 
                    if (datum < min)
                        min = datum;
                    if (datum > max)
                        max = datum;
                }
                ctx.fillRect(i,(1+min)*amp,1,Math.max(1,(max-min)*amp));
            }
    };
    self.updateSelection = function(){
        var slider_value = slider.val().split(",");     
        var x = slider_value[0];
        var w = slider_value[1]-x;    
        var ctx=canvas.getContext("2d");
        if(buffer)self.drawBuffer();
        ctx.globalAlpha=0.5;
        ctx.fillStyle="#747474";
        ctx.fillRect(x,0,w,canvas.height);
    };
    self.getSelection = function(){
        var slider_value = slider.val().split(","); 
        var from = parseInt(buffer.length*slider_value[0]/300.0);
        var to = parseInt(buffer.length*slider_value[1]/300.0);
        return buffer.subarray(from,to);  
    };
    
    self.encodeWAV = function(){
        var samples = buffer;
        console.log(samples.length);
        var buf = new ArrayBuffer(44 + samples.length * 2);
        var view = new DataView(buf);
        var sampleRate = 44100;
        // copied from recorder
        writeString(view, 0, 'RIFF');
        /* file length */
        view.setUint32(4, 32 + samples.length * 2, true);
        /* RIFF type */
        writeString(view, 8, 'WAVE');
        /* format chunk identifier */
        writeString(view, 12, 'fmt ');
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw) */
        view.setUint16(20, 1, true);
        /* channel count */
        view.setUint16(22, 2, true);
        /* sample rate */
        view.setUint32(24, sampleRate, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, sampleRate * 4, true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, 4, true);
        /* bits per sample */
        view.setUint16(34, 16, true);
        /* data chunk identifier */
        writeString(view, 36, 'data');
        /* data chunk length */
        view.setUint32(40, samples.length * 2, true);
        floatTo16BitPCM(view, 44, samples);
        return view;
    }

    panel.on('shown.bs.modal', function (e) {
        slider.slider("setValue",[0,300])
            .val([0,300])
            .on('slide', function(ev){
                self.updateSelection();
            });
        self.updateSelection();
    });
    panel.modal();
        
    return{        
        cropBuffer:function(){    
            buffer = self.getSelection();
            //debug;
            self.drawBuffer();
            
            slider.slider("setValue",[0,300]);
            slider.slider().val([0,300]);
            self.updateSelection();
        },
        upload:function (){
            console.log($("#upload-name"));
            console.log($("#upload-tags"));
            console.log($("#upload-license"));
            console.log($("#upload-description"));
            var fname = $("#upload-name").val()+".wav";
            var description={
                name:$("#upload-name").val()+".wav",
                description:$("#upload-description").val(),
                tags:$("#upload-tags").val(),
                license:$("#upload-license").val(),
            };
            var blob = new Blob([self.encodeWAV()], { type: "audio/wav" });
            freesound.upload(blob, fname, description,
                function(){
                    console.log("Upload OK");
            });
        },
        play:function(button){
            if (!button.classList.contains(play_class)) {
                var sel = self.getSelection();
                var newBuffer = audioContext.createBuffer(1, sel.length, audioContext.sampleRate );
                player = audioContext.createBufferSource();
                player.loop = loop;
                newBuffer.getChannelData(0).set(sel);
                player.buffer = newBuffer;
                player.connect( audioContext.destination );
                player.onended = function(){
                    button.classList.remove(play_class);
                };
                button.classList.add(play_class);
                player.start();
            }
            else{
                self.stop(button);
            }
            return false;
        },
        loop:function(button){
            if (!button.classList.contains(play_class)) {
                button.classList.add(play_class);
                loop = true;
            }
            else{                
                button.classList.remove(play_class);
                loop = false;
            }
        },
        stop:function(button){
            button.classList.remove(play_class);
            player.stop();
         },
    }
}
