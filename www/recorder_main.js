var FreesoundRecorder = function () {
    
    var audioContext=null,
      audioInput = null,
      inputPoint = null,
      recorder = null,
      analyser = null;

    var init = function (context) {
        if (!navigator.getUserMedia) {
            navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        }
        if (!navigator.getUserMedia) {
             showMessage("Your borwser does not support recording.");
        } else {
            navigator.getUserMedia(
                {audio: true},gotStream, function(err) {showMessage(err)});
        }
        audioContext=context;
        analyser = audioContext.createAnalyser();
    };

    var showMessage = function (msg) {
        $("#results").append(msg);
    };

    var gotStream = function (stream) {
        inputPoint = audioContext.createGain();
        audioInput = audioContext.createMediaStreamSource(stream);
        audioInput.connect(inputPoint);
        recorder = new Recorder(inputPoint);        
        audioInput.connect(analyser);
        console.log(analyser);
    };

    var postRecording = function(buffers) {
        recorder.exportWAV(function(blob) {
            var fname = "tmp.wav";
            var fd = new FormData();
            fd.append('audiofile', blob, fname);
            var request = new XMLHttpRequest();
            request.onreadystatechange = function() {
                if (request.readyState == 4) {
                    $("#results").empty();
                    $("#results").html(request.responseText);
                }
            }
            request.open("POST", "query");
            request.send(fd);
        });
    };

    var toggleRecording = function(e) {
        if (e.classList.contains("btn-danger")) {
            recorder.stop();
            e.classList.remove("btn-danger");
            recorder.getBuffer(postRecording);
        } else {
            if (!recorder) {
                    showMessage("Please allow me to use the microphone");
                    return;
            }
            e.classList.add("btn-danger");
            recorder.clear();
            $("#results").empty();
            recorder.record();
        }
    };
    return {
        init:init,
        getAnalyser:function(){console.log(analyser);return analyser},
        toggleRecording:toggleRecording
    }
};