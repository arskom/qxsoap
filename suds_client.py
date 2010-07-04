#!/usr/bin/env python

from suds.client import Client

c=Client('http://localhost:7789/svc/?wsdl')

print "Information in the WSDL"
print "------------------------"
print c

print
print "Service Response"
print "-----------------"
print c.service.say_hello('punk',5)
