
/*
 * Copyright (c) Burak Arslan (burak.arslan-qx@arskom.com.tr).
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the Arskom Consultancy Ltd. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 * AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
 * OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

qx.Class.define("soap.ClientCollection", { extend: qx.core.Object
    ,construct: function(url, client_class, header_class) {
        this.c = new Object();
        this.set_url(url);

        if (client_class) {
            this.set_client_class(client_class);
        }
        else {
            this.set_client_class(soap.Client);
        }

        if (header_class) {
            this.set_header_class(header_class);
        }
        else {
            this.set_header_class(soap.RequestHeader);
        }

    }
    ,properties : {
         _url : {check:"String"}
        ,_client_class : {check: "Function"}
        ,_header_class : {check: "Function"}
    }
    ,members: {
         c: null

        ,add_address: function(address, callback) {
            var parts = address.split('/');
            var obj = this.c;

            for (var i=0,l=parts.length; i<l; ++i) {
                var caddr = parts.slice(0,i+1).join("/");

                if (i == l-1) {
                    var curl = this.get_url() + "/" + caddr + "/";
                    var c_class = this.get_client_class();
                    var h_class = this.get_header_class();
                    var client = new c_class(curl, h_class);
                    if (callback) {
                        try {
                            // this is just to have the wsdl requested, so the
                            // method name does not matter.
                            client.easy("!_wsdl_!", callback);
                        }
                        catch(e) {

                        }
                    }
                    obj[parts[i]] = client;
                }
                else if (parts[i].length > 0 && (! obj[parts[i]])) {
                    obj[parts[i]] = new Object();
                }
            }
        }
    }
});
