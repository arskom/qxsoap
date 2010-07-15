
This is an implementation of the SOAP 1.1 protocol with an RPC application in
mind. It aims to support DOM level-1 compliant browsers.

Tested with CherryPy 3.1 and soaplib-lxml from http://github.com/plq/soaplib-lxml/tree/master
on Python 2.6.2, and with Qooxdoo 1.1.

Preparing the client
-----------------------

Unpack a qooxdoo distribution in the qooxdoo folder, or create symlinks to one.
It has to be there so your web browser can find it via the included web server.
Then run ./generate.py source in the client folder and generate the client
loader script.

Preparing the server
-----------------------

Chdir to the project directory (same as this README file) and run:

        git clone git://github.com/plq/soaplib.git ~/soaplib
        export PYTHONPATH=$PYTHONPATH:~/soaplib/src
        python soap_server.py

and wait for the

         http://0.0.0.0:7789/

line to appear. Then navigate to:

         http://localhost:7789/static/demo/default/source/

and you should see the main screen which is a toolbar with two buttons to the
upper right.
