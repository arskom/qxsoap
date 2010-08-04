
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

qx.Class.define("soap.test.SoaplibInterop", { extend : qx.dev.unit.TestCase,
    construct : function() {
        this.c = new soap.Client('http://'+document.location.host+'/app/');
        try {
            this.c.easy("!_name_!");
        }
        catch(e) {

        }
        this.ns = "soaplib.test.interop.server._service";
        qx.log.Logger.debug("hey.");
    }

    ,members : {
          c : null
         ,ns: null

        // helper functions

        ,__test_echo: function(service_name, val, cb) {
            var ctx = this;

            ctx.c.easy(service_name
                ,val
                ,function(r) {
                    ctx.resume(function() {
                        if (cb) {
                            cb(r,val)
                        }
                        else {
                            ctx.assertEquals(r, val);
                        }
                    });
                });
            ctx.wait();
        }

        ,__test_echo_array: function(service_name, val, cb) {
            var ctx = this;

            ctx.__test_echo(service_name, val, function(r,v) {
                for (var i=0,l=r.length; i<l; ++i) {
                    if (cb) {
                        cb(r,v,i);
                    }
                    else {
                        ctx.assertEquals(r[i], val[i]);
                    }
                }
            });
        }

        // primitive tests

        ,test_echo_string : function() {
            var service_name = "echo_string";

            var val = "punk üğışçöÜĞİŞÇÖ";

            this.__test_echo(service_name, val);
        }

        ,test_echo_integer : function() {
            var service_name = "echo_integer";

            var val = 10;

            this.__test_echo(service_name, val);
        }

        ,test_echo_float : function() {
            var service_name = "echo_float";

            var val = 10.1;

            this.__test_echo(service_name, val);
        }

        ,test_echo_double : function() {
            var service_name = "echo_double";

            var val = 123132123.124;

            this.__test_echo(service_name, val);
        }

        ,test_echo_boolean : function() {
            var service_name = "echo_boolean";

            var val = true;

            this.__test_echo(service_name, val);
        }

        ,test_echo_datetime : function() {
            var service_name = "echo_datetime";

            var ctx = this;
            var val = new Date();

            this.__test_echo(service_name, val, function(r,v) {
                ctx.assertEquals(r.getTime(), v.getTime());
            });
        }

        // array tests

        ,test_echo_integer_array : function() {
            var service_name = "echo_integer_array";

            var val = [1,3,5,7,11];

            this.__test_echo_array(service_name, val);
        }

        ,test_echo_string_array : function() {
            var service_name = "echo_string_array";

            var val = ["hobaaa", "bir", "punk", "üğışçöÜĞİŞÇÖ"];

            this.__test_echo_array(service_name, val);
        }

        ,test_echo_float_array : function() {
            var service_name = "echo_float_array";

            var val = [1.1, 3.3, 5.5, 7.7, 11.11];

            this.__test_echo_array(service_name, val);
        }

        ,test_echo_double_array : function() {
            var service_name = "echo_double_array";

            var val = [1123123123.12, 12.34];

            this.__test_echo_array(service_name, val);
        }

        ,test_echo_boolean_array : function() {
            var service_name = "echo_boolean_array";

            var val = [true,false,true];

            this.__test_echo_array(service_name, val);
        }

        // complex object tests

        // misc tests
        ,test_empty: function() {
            var ctx=this;
            var service_name = "test_empty";

            ctx.c.easy(service_name
                ,function(r) {
                    ctx.resume(function() {
                        
                    });
                });
            ctx.wait();
        }

        ,test_multi_param: function() {
            var service_name = "multi_param";
            var ctx=this;
            ctx.c.easy(service_name
                ,"string"
                ,123
                ,new Date()
                ,function(r) {
                    ctx.resume(function() {

                    });
                });
            ctx.wait();
        }

        ,test_return_only: function() {
            var service_name = "return_only";
            var ctx=this;
            ctx.c.easy(service_name
                ,function(r) {
                    ctx.resume(function() {
                        ctx.assertEquals(r, 'howdy');
                    });
                });
            ctx.wait();
        }

        ,test_alternate_name: function() {
            var service_name = "do_something";
            var ctx=this;
            var val = 'punk';

            ctx.c.easy(service_name
                ,'punk'
                ,function(r) {
                    ctx.resume(function() {
                        ctx.assertEquals(r, val);
                    });
                });
            ctx.wait();
        }
    }
});
