#! /usr/bin/env python
import random,time,sys,os,cgi
import subprocess
import json
import uuid
import numpy, scipy,freesound, essentia
from scipy.io import wavfile

from numpy import *
from scipy.io import *
from twisted.web import server, resource, static
from twisted.internet import reactor, threads
from twisted.internet.threads import deferToThread
from twisted.web.server import NOT_DONE_YET
import essentia
from essentia.standard import *

c = freesound.FreesoundClient()
c.set_token("<YOUR_API_TOKEN>","token")

class SoundQueryServer(resource.Resource):
    isLeaf = True

    def extract_mfcc(self,fname):
        w = Windowing(type = 'blackmanharris62')
        spectrum = Spectrum()
        mfcc = essentia.standard.MFCC()
        loader=EasyLoader(filename=fname)
        audio = loader.compute()
        pool = essentia.Pool()
        for frame in FrameGenerator(audio, frameSize = 2048 , hopSize = 1024):
            mfcc_bands, mfcc_coeffs = mfcc(spectrum(w(frame)))
            pool.add('lowlevel.mfcc', mfcc_coeffs)
        agg = PoolAggregator(defaultStats = [ 'mean', 'var','dmean','dvar' ])(pool)
        return agg

    def render_POST(self, request):
        deferred= deferToThread(self.process_query, request)
        deferred.addCallback(self.print_success, request)
        deferred.addErrback(self.print_failure,request)
        return NOT_DONE_YET

    def print_success(self, result, request):
        request.write(result)
        request.finish()


    def print_failure(self, err, request):
        print err
        request.write("Some error occurred")
        request.finish()


    def process_query(self,request):
        upfilecontent = request.args['audiofile']
        if upfilecontent:
                floats = numpy.fromstring(upfilecontent[0], 'int16')
                out_fname=str(uuid.uuid1())+".wav"
                fout = file(out_fname, 'wb')
                fout.write (upfilecontent[0])
                fout.close()
                pool = self.extract_mfcc(out_fname)
                m =",".join(["%.3f"%x for x in pool['lowlevel.mfcc.mean']])
                v =",".join(["%.3f"%x for x in pool['lowlevel.mfcc.var']])
                dm =",".join(["%.3f"%x for x in pool['lowlevel.mfcc.dmean']])
                dv =",".join(["%.3f"%x for x in pool['lowlevel.mfcc.dvar']])
                try:
                    results = c.content_based_search(target="lowlevel.mfcc.mean:"+m+" lowlevel.mfcc.var:"+v+\
                        " lowlevel.mfcc.dmean:"+dm+" lowlevel.mfcc.dvar:"+dv,
                        fields="id,name,url,analysis,previews,images", \
                        filter="duration:0 TO 3")

                    results_str = ""
                    for r in results:
                        result = u'<div> <a href="%s"> %s </a><br>'
                        result = result + '<img width="300" src="%s"/><br><br>';
                        result = result + '<audio class="player" controls="controls" reload="none">';
                        result = result + ' <source src="%s" type="audio/mpeg" />';
                        result = result + ' <source src="%s" type="audio/ogg"/></audio></div>';
                        result = result%(r.url,unicode(r.name),r.images.waveform_m,\
                                r.previews.preview_lq_mp3,r.previews.preview_lq_ogg)
                        results_str = results_str+result
                    os.remove(out_fname)
                except Exception as ex:
                    print ex

        return str(results_str)

root = resource.Resource()
file_server = static.File("www")
file_server.putChild("query",SoundQueryServer())
root.putChild("fsmic",file_server)
site = server.Site(root)
reactor.listenTCP(8005, site)
reactor.run()
