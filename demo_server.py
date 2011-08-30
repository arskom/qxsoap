#!/usr/bin/python -Ott

#
# Copyright (c) Burak Arslan <burak.arslan@arskom.com.tr>
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#     * Redistributions of source code must retain the above copyright
#       notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above copyright
#       notice, this list of conditions and the following disclaimer in the
#       documentation and/or other materials provided with the distribution.
#     * Neither the name of Arskom Consultancy Ltd. or Burak Arslan, nor the
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

import logging
logging.basicConfig(level=logging.DEBUG)
logging.getLogger('rpclib.protocol.soap._base').setLevel(logging.DEBUG)

from twisted.python import log
observer = log.PythonLoggingObserver('twisted')
log.startLoggingWithObserver(observer.emit,setStdout=False)

import sys

from datetime import datetime

from rpclib.protocol.soap import Soap11
from rpclib.interface.wsdl import Wsdl11

from rpclib.server.wsgi import WsgiApplication
from rpclib.application import Application
from rpclib.model.complex import ComplexModel
from rpclib.model.complex import Array
from rpclib.model.primitive import DateTime
from rpclib.model.primitive import Integer
from rpclib.model.primitive import String
from rpclib.decorator import rpc
from rpclib.decorator import srpc
from rpclib.server import wsgi
from rpclib.service import ServiceBase
from rpclib.util.wsgi_wrapper import run_twisted

class RequestHeader(ComplexModel):
    __namespace__ = 'soap'

    row = Integer(ge=0)
    sort_key = String
    sort_ord = String

class ReturnObject(ComplexModel):
    byone=Integer
    bytwo=Integer
    bythree=Integer
    byfour=Integer
    byfive=Integer

class NestedObject(ComplexModel):
    date_time = DateTime
    ro = ReturnObject
    arr = Array(String)

#
# Hello World example from http://trac.optio.webfactional.com/wiki/HelloWorld
#

class HelloWorldService(ServiceBase):
    max=5000 # adjust to your taste

    @srpc(String,Integer,_returns=Array(String))
    def say_hello(name,times):
        results = []
        for i in range(0,times):
            results.append('Hello, %s'%name)
        return results

    @rpc(_returns=Array(ReturnObject), _in_header=RequestHeader)
    def get_integers(ctx):
        if ctx.in_header == None:
            raise Exception('invalid request: header object is null')

        retval=[]
        for i in range(ctx.in_header.row, ctx.in_header.row+50):
            retelt=ReturnObject()
            retelt.byone   = i
            retelt.bytwo   = i*2
            retelt.bythree = i*3
            retelt.byfour  = i*4
            retelt.byfive  = i*5

            retval.append(retelt)

        return retval

    @srpc(_returns=Integer)
    def get_integers_count():
        return HelloWorldService.max

    @srpc(_returns=String)
    def name ():
        return HelloWorldService.__name__

    @srpc(NestedObject, _returns=NestedObject)
    def get_nested(complex):
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

application = Application([HelloWorldService], 'qx.soap.demo',
        interface=Wsdl11(),
        in_protocol=Soap11(validator='lxml'),
        out_protocol=Soap11()
    )

twisted_apps = [ 
    (WsgiApplication(application), 'app')
]

if __name__=='__main__':
    sys.exit(run_twisted(twisted_apps, 7789))
