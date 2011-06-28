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
logger = logging.getLogger('rpclib.wsgi')
logger.setLevel(logging.DEBUG)

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
from rpclib.server import wsgi
from rpclib.service import ServiceBase
from rpclib.util.wsgi_wrapper import run_twisted

class SOAPRequest(ComplexModel):
    startrow = Integer
    startid = Integer
    sort_by = Integer
    sort_ord = String
    who = String

    def __init__(self, startrow=0):
        self.startrow = startrow
        self.endrow = startrow+50

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
        return self.max

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

apps = [ (WsgiApplication(Application([HelloWorldService], Wsdl11, Soap11, tns='qx.soap.demo')), 'svc') ]

if __name__=='__main__':
    sys.exit(run_twisted(apps, 7789))
