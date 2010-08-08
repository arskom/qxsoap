
This is an implementation of the SOAP 1.1 protocol with an RPC application in
mind. It aims to support DOM level-1 compliant browsers.

Tested with Twisted 8.2 and soaplib from http://github.com/arskom/soaplib
on Python 2.6.2, and with Qooxdoo 1.1.

Using `qxsoap` in your application
==================================

Download the latest package from http://github.com/arskom/qxsoap/downloads and
unpack it to source/lib/soap folder in your project root. If you don't have a
`source/lib` folder, it's OK to create it.

Then modify the "let" and "jobs" sections in your `config.json` to to contain 
the entries below:

    {
        "let" : {
             "SOAP_PATH" : "./source/lib/soap"
            ,"SOAP_URI"  : "lib/soap"
        }
    
        ,"jobs" : {
            "libraries" : {
                 "library" : [ 
                    { "manifest" : "${SOAP_PATH}/Manifest.json", "uri" : "${SOAP_URI}" }
                ]
            }
        }
    }

Use the soap client in your application, then run `./generate.py source` to 
have it included. You can look at the [`soap.test.SoaplibInterop`](http://github.com/arskom/qxsoap/blob/master/source/class/soap/test/SoaplibInterop.js)
class and the [demo application](http://github.com/arskom/qxsoap/tree/master/demo/default/source/class/soap/demo/) for examples.

Running the demo
================

Preparing the client
--------------------

Unpack a qooxdoo distribution in the qooxdoo folder, or create symlinks to one.
It has to be there so your web browser can find it via the included web server.
Then run ./generate.py source in the `demo/default` folder and generate the client
loader script.

Preparing the server
--------------------

Install the latest soaplib and twisted from pypi. As a priviledged user, you can 
execute the following command:

    easy_install soaplib
    easy_install twisted

Once soaplib and twisted are installed, you can run the demo server using the
following command:

    ./demo_server.py

Wait for the

         http://0.0.0.0:7789/

line to appear. Then navigate to:

         http://localhost:7789/demo/default/source/

and you should see the main screen which is a toolbar with two buttons to the
upper right.
