import BaseHTTPServer, os, cgi
import cgitb; cgitb.enable()

html = """
<html>
<body>
<form action="" method="POST" enctype="multipart/form-data">
File upload: <input type="file" name="upfile">
<input type="submit" value="upload">
</form>
</body>
</html>
"""
class Handler(BaseHTTPServer.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("content-type", "text/html;charset=utf-8")
        self.end_headers()
        self.wfile.write(html)

    def do_POST(self):
        ctype, pdict = cgi.parse_header(self.headers.getheader('content-type'))
        if ctype == 'multipart/form-data':
            query = cgi.parse_multipart(self.rfile, pdict)
            upfilecontent = query.get('upfile')
            if upfilecontent:
                # i don't know how to get the file name.. so i named it 'tmp.dat'
                fout = file(os.path.join('tmp', 'tmp.dat'), 'wb')
                fout.write (upfilecontent[0])
                fout.close()
        self.do_GET()

if __name__ == '__main__':
    server = BaseHTTPServer.HTTPServer(("127.0.0.1", 8080), Handler)
    print('web server on 8080..')
    server.serve_forever()
