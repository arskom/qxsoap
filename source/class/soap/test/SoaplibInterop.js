
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

        ,__get_xml_test_val : function() {
            var doc = qx.xml.Document.create();
            var sub=soap.Client.createSubElementNS(doc, doc, "test_sub", "test_ns");
            var subsub1=soap.Client.createSubElementNS(doc, sub, "test_subsub1", "test_ns");
            var subsubsub1=soap.Client.createSubElementNS(doc, subsub1, "test_subsubsub1", "test_ns");
            var subsub2=soap.Client.createSubElementNS(doc, sub, "test_subsub2", "test_ns");
            var subsub3=soap.Client.createSubElementNS(doc, sub, "test_subsub3", "test_ns");

            subsubsub1.nodeValue = "subsubsub1 value";
            subsub2.nodeValue = "subsub2 value";
            subsub3.nodeValue = "subsub3 value";

            return sub;
        }

        ,test_echo_any : function() {
            var service_name = "echo_any";

            var val = this.__get_xml_test_val();

            this.__test_echo(service_name, val);
        }

        ,test_echo_any_as_dict : function() {
            var service_name = "echo_any_as_dict";

            var val = this.__get_xml_test_val();

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

        ,__test_simple_class : function(r,v) {
            this.assertEquals(r.get_i(), v.get_i());
            this.assertEquals(r.get_s(), v.get_s());
        }

        ,__test_nested_class : function(r,v) {
            this.assertEquals(r.get_i(), v.get_i());
            this.assertEquals(r.get_s(), v.get_s());
            this.assertEquals(r.get_f(), v.get_f());

            for (var i=0; i<r.get_simple().length; ++i) {
                this.__test_simple_class(r.get_simple()[i], v.get_simple()[i]);
            }

            this.__test_other_class(r.get_other(), v.get_other());
        }

        ,__test_other_class : function(r,v) {
            this.assertEquals(r.get_dt().getTime(), v.get_dt().getTime());
            this.assertEquals(r.get_d(), v.get_d());
            this.assertEquals(r.get_b(), v.get_b());
        }

        ,__test_non_nillable_class : function(r,v) {
            this.assertEquals(r.get_dt().getTime(), v.get_dt().getTime());
            this.assertEquals(r.get_i(), v.get_i());
            this.assertEquals(r.get_s(), v.get_s());
        }

        ,__test_extended_class : function(r,v) {
            this.assertEquals(r.get_i(), v.get_i());
            this.assertEquals(r.get_s(), v.get_s());
            this.assertEquals(r.get_f(), v.get_f());

            for (var i=0; i<r.get_simple().length; ++i) {
                this.__test_simple_class(r.get_simple()[i], v.get_simple()[i]);
            }

            this.__test_other_class(r.get_other(), v.get_other());
            this.__test_non_nillable_class(r.get_p(), v.get_p());
            this.assertEquals(r.get_l().getTime(), v.get_l().getTime());
            this.assertEquals(r.get_q(), v.get_q());
        }

        ,test_echo_simple_class : function() {
            var service_name = "echo_simple_class";
            var ctx = this;

            var val = this.c.get_object(ctx.ns,"SimpleClass");
            val.set_i(45);
            val.set_s("asd");

            this.__test_echo(service_name, val, function(r,v) {
                ctx.__test_simple_class(r,v);
            });
        }

        ,test_echo_simple_class_array : function() {
            var service_name = "echo_simple_class_array";
            var ctx = this;
            var val = []

            val.push(this.c.get_object(ctx.ns,"SimpleClass"));
            val.push(this.c.get_object(ctx.ns,"SimpleClass"));

            val[0].set_i(45);
            val[0].set_s("asd");

            val[1].set_i(12);
            val[1].set_s("qwe");

            this.__test_echo_array(service_name, val, function(r,v,i) {
                ctx.__test_simple_class(r[i],v[i]);
            });
        }

        ,test_echo_nested_class : function() {
            var service_name = "echo_nested_class";
            var ctx = this;
            var val = this.c.get_object(ctx.ns,"NestedClass");

            val.set_i(45);
            val.set_s("asd");
            val.set_f(12.34);

            val.set_simple([]);
            val.get_simple().push(this.c.get_object(ctx.ns,"SimpleClass"));
            val.get_simple().push(this.c.get_object(ctx.ns,"SimpleClass"));

            val.get_simple()[0].set_i(45);
            val.get_simple()[0].set_s("asd");
            val.get_simple()[1].set_i(12);
            val.get_simple()[1].set_s("qwe");

            val.set_other(this.c.get_object(ctx.ns,"OtherClass"));
            val.get_other().set_dt(new Date(2010,05,02));
            val.get_other().set_d(123.456);
            val.get_other().set_b(true);

            this.__test_echo(service_name, val, function(r,v) {
                ctx.__test_nested_class(r,v);
            });
        }

        ,test_echo_nested_class_array : function() {
            var service_name = "echo_nested_class_array";
            var ctx = this;
            var val = []

            val.push(this.c.get_object(ctx.ns,"NestedClass"));
            val.push(this.c.get_object(ctx.ns,"NestedClass"));

            for (var i=0; i< val.length; ++i) {
                val[i].set_i(45 + i);
                val[i].set_s("asd" + i);
                val[i].set_f(12.34 + i);

                val[i].set_simple([]);
                val[i].get_simple().push(this.c.get_object(ctx.ns,"SimpleClass"));
                val[i].get_simple().push(this.c.get_object(ctx.ns,"SimpleClass"));

                val[i].get_simple()[0].set_i(45 + i);
                val[i].get_simple()[0].set_s("asd"  + i);
                val[i].get_simple()[1].set_i(12 + i);
                val[i].get_simple()[1].set_s("qwe" + i);

                val[i].set_other(this.c.get_object(ctx.ns,"OtherClass"));
                val[i].get_other().set_dt(new Date(new Date().getTime() + i));
                val[i].get_other().set_d(123.456 + i);
                val[i].get_other().set_b(true);
            }

            this.__test_echo_array(service_name, val, function(r,v,i) {
                ctx.__test_nested_class(r[i],v[i]);
            });
        }

        ,test_echo_extension_class : function() {
            var service_name = "echo_extension_class";
            var ctx = this;
            var val = this.c.get_object(ctx.ns,"ExtensionClass");

            val.set_i(45);
            val.set_s("asd");
            val.set_f(12.34);

            val.set_simple([]);
            val.get_simple().push(this.c.get_object(ctx.ns,"SimpleClass"));
            val.get_simple().push(this.c.get_object(ctx.ns,"SimpleClass"));

            val.get_simple()[0].set_i(45);
            val.get_simple()[0].set_s("asd");
            val.get_simple()[1].set_i(12);
            val.get_simple()[1].set_s("qwe");

            val.set_other(this.c.get_object(ctx.ns,"OtherClass"));
            val.get_other().set_dt(new Date(2010,05,02));
            val.get_other().set_d(123.456);
            val.get_other().set_b(true);

            val.set_p(this.c.get_object(ctx.ns,"NonNillableClass"));
            val.get_p().set_dt(new Date(2010,06,02));
            val.get_p().set_i(123);
            val.get_p().set_s("punk");

            val.set_l(new Date(2010,07,02));
            val.set_q(5);

            this.__test_echo(service_name, val, function(r,v) {
                ctx.__test_extended_class(r,v);
            });
        }

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
