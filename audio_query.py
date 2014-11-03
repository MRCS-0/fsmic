#! /usr/bin/env python
import random,time,sys,os,cgi
import subprocess
import json
import pyaudio, numpy, scipy,freesound, essentia
from scipy.io import wavfile

from numpy import *
from scipy.io import *
from twisted.web import server, resource, static
from twisted.internet import reactor, threads
import essentia
from essentia.standard import *

c = freesound.FreesoundClient()
c.set_token("7a601680b44a94be17a11d79fe36c83790d43b63","token")


class SoundQueryServer(resource.Resource):
    isLeaf = True
    def render_GET(self, request):
        return "OK"

    def extract_mfcc(self,fname):
        w = Windowing(type = 'blackmanharris62')
        spectrum = Spectrum()
        mfcc = essentia.standard.MFCC()
        mfccs =[]
        loader=EasyLoader(filename=fname)
        audio = loader.compute()
        for frame in FrameGenerator(audio, frameSize = 2048 , hopSize = 1024):
            mfcc_bands, mfcc_coeffs = mfcc(spectrum(w(frame)))
            mfccs.append(mfcc_coeffs)
        mfccs = essentia.array(mfccs).T
        return mfccs


    def render_POST(self,request):
        print request.args.keys()       
        #print postfile.keys()
        print request.requestHeaders.getRawHeaders("content-type")
        upfilecontent = request.args['audiofile']
        print type(upfilecontent[0])

        #print floats
        if upfilecontent:
                floats = numpy.fromstring(upfilecontent[0], 'int16')
                print floats[0:50]
                fout = file("uploaded.wav", 'wb')
                fout.write (upfilecontent[0])
                fout.close()
                #fs, sig = wavfile.read("uploaded.wav")
                #print sig[1:50]
                mfcc_frames = self.extract_mfcc("uploaded.wav");
                mfcc_mean=numpy.mean(mfcc_frames,1)
                mfcc_var=numpy.var(mfcc_frames,1)
                m =",".join(["%.3f"%x for x in mfcc_mean])
                v =",".join(["%.3f"%x for x in mfcc_var])
                print m
                results = c.content_based_search(target="lowlevel.mfcc.mean:"+m+" lowlevel.mfcc.var:"+v,\
                    fields="id,name,url,analysis,previews,images", descriptors="lowlevel.mfcc.mean,lowlevel.mfcc.var", \
                    filter="duration:0 TO 3")
                results_str = ""
                for r in results:
                    print r.url
                    print r.previews.preview_lq_mp3   
                    result = '<div> %s <br>'
                    result = result + '<img width="200" height="80" src="%s"/><br><br>';
                    result = result + '<audio controls="controls" reload="none">';
                    result = result + ' <source src="%s" type="audio/mpeg" />';
                    result = result + ' <source src="%s" type="audio/ogg"/></audio></div>';
                    result = result%(r.name,r.images.waveform_m,r.previews.preview_lq_mp3,r.previews.preview_lq_ogg)
                    results_str = results_str+result
        print "time to return"  
        print isinstance(results_str,bytes)
        return str(results_str)





root = resource.Resource()
file_server = static.File("www")
file_server.putChild("query",SoundQueryServer())
root.putChild("sound_query",file_server)
site = server.Site(root)
reactor.listenTCP(8000, site)
reactor.run()
