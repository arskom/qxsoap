#!/usr/bin/python -Ot

# 
# Copyright (c) 2008-2009, Burak Arslan (burak.arslan-qx@arskom.com.tr) 
# and others.
# All rights reserved.
# 
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#     * Redistributions of source code must retain the above copyright
#       notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above copyright
#       notice, this list of conditions and the following disclaimer in the
#       documentation and/or other materials provided with the distribution.
#     * Neither the name of the Arskom Consultancy Ltd. nor the
#       names of its contributors may be used to endorse or promote products
#       derived from this software without specific prior written permission.
# 
# THIS SOFTWARE IS PROVIDED BY Burak Arslan ''AS IS'' AND ANY
# EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL Burak Arslan BE LIABLE FOR ANY
# DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
# ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
#

import errno
import sys

import BaseHTTPServer
import SimpleHTTPServer
import SocketServer
import os
import socket
import traceback
import urlparse

from datetime import datetime

from soaplib.serializers.clazz import ClassSerializer
from soaplib.serializers.primitive import Array
from soaplib.serializers.primitive import DateTime
from soaplib.serializers.primitive import Integer
from soaplib.serializers.primitive import String
from soaplib.service import rpc
from soaplib.wsgi_soap import SimpleWSGIApp

static_folder='/static/'
class BasicWebServiceDaemon:
    from cherrypy.wsgiserver import CherryPyWSGIServer

    def __init__(self, func, server_address=("0.0.0.0", 8080)):
        self.runbasic(func, server_address)

    def runbasic(self, func, server_address):
        """
        Runs a simple HTTP server hosting WSGI app `func`. The directory
        "static_folder" is hosted statically.

        Based on [WsgiServer][ws] from [Colin Stewart][cs].

        [ws]: http://www.owlfish.com/software/wsgiutils/documentation/wsgi-server-api.html
        [cs]: http://www.owlfish.com/
        """
        # Copyright (c) 2004 Colin Stewart (http://www.owlfish.com/)
        # Modified somewhat for simplicity
        # Used under the modified BSD license:
        # http://www.xfree86.org/3.3.6/COPYRIGHT2.html#5

        class WSGIHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
            def run_wsgi_app(self):
                protocol, host, path, parameters, query, fragment = \
                    urlparse.urlparse('http://dummyhost%s' % self.path)
    
                # we only use path, query
                env = { 'wsgi.version': (1, 0)
                    ,'wsgi.url_scheme': 'http'
                    ,'wsgi.input': self.rfile
                    ,'wsgi.errors': sys.stderr
                    ,'wsgi.multithread': 1
                    ,'wsgi.multiprocess': 0
                    ,'wsgi.run_once': 0
                    ,'REQUEST_METHOD': self.command
                    ,'REQUEST_URI': self.path
                    ,'PATH_INFO': path
                    ,'QUERY_STRING': query
                    ,'CONTENT_TYPE': self.headers.get('Content-Type', '')
                    ,'CONTENT_LENGTH': self.headers.get('Content-Length', '')
                    ,'REMOTE_ADDR': self.client_address[0]
                    ,'SERVER_NAME': self.server.server_address[0]
                    ,'SERVER_PORT': str(self.server.server_address[1])
                    ,'SERVER_PROTOCOL': self.request_version
                    }
    
                for http_header, http_value in self.headers.items():
                    env ['HTTP_%s' % http_header.replace('-', '_').upper()] = http_value
    
                # Setup the state
                self.wsgi_sent_headers = 0
                self.wsgi_headers = []
    
                try:
                    # We have there environment, now invoke the application
                    called=False
                    if callable(self.server.app):
                        result = self.server.app(env, self.wsgi_start_response)
                        called=True
                    else:
                        for a in self.server.app:
                            if a[0] == path:
                                result = a[1](env, self.wsgi_start_response)
                                called=True
                                break

                    if not called:
                        result=['no service configured at path ' + path]
                        self.wsgi_headers= ('404 ERR', [('Content-type', 'text/html')])

                    try:
                        try:
                            for data in result:
                                if data: 
                                    self.wsgi_write_data(data)
                        finally:
                            if hasattr(result, 'close'): 
                                result.close()
                    except socket.error, socket_err:
                        # Catch common network errors and suppress them
                        if (socket_err.args[0] in (errno.ECONNABORTED, errno.EPIPE)): 
                            return
                    except socket.timeout, socket_timeout: 
                        return
                except Exception,e:
                    print traceback.format_exc(),
    
                if (not self.wsgi_sent_headers):
                    # We must write out something!
                    self.wsgi_write_data(" ")
                return
    
            do_POST = run_wsgi_app
            do_PUT = run_wsgi_app
            do_DELETE = run_wsgi_app
    
            def do_GET(self):
                if self.path.startswith(static_folder):
                    self.path = '/'+'/'.join(self.path.split('/')[2:])
                    SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)
                else:
                    self.run_wsgi_app()
    
            def wsgi_start_response(self, response_status, response_headers, 
                                exc_info=None):
                if (self.wsgi_sent_headers):
                    raise Exception("Headers already sent and start_response called again!")
                # Should really take a copy to avoid changes in the application....
                self.wsgi_headers = (response_status, response_headers)
                return self.wsgi_write_data
    
            def wsgi_write_data(self, data):
                if (not self.wsgi_sent_headers):
                    status, headers = self.wsgi_headers
                    # Need to send header prior to data
                    status_code = status[:status.find(' ')]
                    status_msg = status[status.find(' ') + 1:]
                    self.send_response(int(status_code), status_msg)
                    for header, value in headers:
                        self.send_header(header, value)
                    self.end_headers()
                    self.wsgi_sent_headers = 1
                # Send the data
                self.wfile.write(data)
                
        class WSGIServer(SocketServer.ThreadingMixIn, BaseHTTPServer.HTTPServer):
            def __init__(self, func, server_address):
                BaseHTTPServer.HTTPServer.__init__(self, server_address, WSGIHandler)
                self.app = func
                self.serverShuttingDown = 0
    
        print "http://%s:%d/" % server_address
        WSGIServer(func, server_address).serve_forever()
    
class SOAPRequest(ClassSerializer):
    startrow = Integer
    startid = Integer
    sort_by = Integer
    sort_ord = String
    who = String

    def __init__(self, startrow=0):
        self.startrow = startrow
        self.endrow = startrow+50

class ReturnObject(ClassSerializer):
    byone=Integer
    bytwo=Integer
    bythree=Integer
    byfour=Integer
    byfive=Integer

class NestedObject(ClassSerializer):
    date_time = DateTime
    ro = ReturnObject
    arr = Array(String)

#
# Hello World example from http://trac.optio.webfactional.com/wiki/HelloWorld
#

class HelloWorldService(SimpleWSGIApp):
    maxIntegerSize=5000 # adjust to your taste

    @rpc(String,Integer,_returns=Array(String))
    def say_hello(self,name,times):
        results = []
        for i in range(0,times):
            results.append('Hello, %s'%name)
        return results

    @rpc(SOAPRequest, _returns=Array(ReturnObject))
    def get_integers(self,req):
        if req == None:
            raise Exception('invalid request: request object is null')

        else:
            if req.startrow < 0:
                raise Exception('invalid request: startrow < 0')

        retval=[]
        for i in range(req.startrow, req.startrow+50):
            retelt=ReturnObject()
            retelt.byone   = i
            retelt.bytwo   = i*2
            retelt.bythree = i*3
            retelt.byfour  = i*4
            retelt.byfive  = i*5

            retval.append(retelt)

        return retval

    @rpc(SOAPRequest, _returns=Integer)
    def get_integers_count(self, req):
        return self.maxIntegerSize

    @rpc(_returns=String)
    def name (self):
        return self.__class__.__name__

    @rpc(NestedObject, _returns=NestedObject)
    def get_nested(self,complex):
        retval = NestedObject()
        retval.date_time = datetime.now()

        retval.ro=ReturnObject()
        i=5
        retval.ro.byone   = i
        retval.ro.bytwo   = i*2
        retval.ro.bythree = i*3
        retval.ro.byfour  = i*4
        retval.ro.byfive  = i*5
        retval.arr = ['asd097n09a', 'askdj0n3t']

        return retval

if __name__=='__main__':
    l=[ ('/svc/', HelloWorldService()),
        ('/svc.wsdl', HelloWorldService()) ]
    
    print 'cwd is %s' % os.getcwd()
    if os.getcwd() != sys.path[0]:
        os.chdir(sys.path[0])
        print 'chdir to', sys.path[0]
    print 'cwd is %s' % os.getcwd()

    BasicWebServiceDaemon(l, ("0.0.0.0",7789))
