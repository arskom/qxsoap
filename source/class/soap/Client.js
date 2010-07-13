
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

qx.Class.define("soap.Client", {extend : qx.core.Object
    ,include : [qx.locale.MTranslation]
    ,construct : function(url) {
        this.base(arguments);

        this.set_url(url)
    }

    ,events : {
        "failed" : "qx.event.type.Event",
        "wsdl_failed" : "qx.event.type.Event"
    }

    ,properties : {
        _url : {check : "String"}
    }

    ,statics : {
        TYPE_MAP : {
             "boolean": "Boolean"
            ,"int": "Integer"
            ,"long": "Integer"
            ,"integer": "Integer"

            ,"double": "Double"
            ,"float": "Float"
            
            ,"datetime": "Date"
            ,"string" : "String"
            ,"anytype": "Document"
        }

        // http://msmvps.com/blogs/martin_honnen/archive/2009/04/15/creating-xml-with-namespaces-with-javascript-and-msxml.aspx
        ,setAttributeNS: function(doc, node, name, ns, value) {
            if (qx.core.Variant.isSet("qx.client", "mshtml")) {
                var attr = doc.createNode(2, name, ns);
                attr.nodeValue = value;
                node.setAttributeNode(attr);
            }
            else {
                node.setAttributeNS(ns, name, value);
            }
        }

        ,type_qname_to_ns: function(node, type_qname) {
            var retval;

            var type_defn = type_qname.split(":");

            if (type_defn.length > 0) {
                var tnode = node;
                while (! retval) {
                    if (tnode.getAttribute) {
                        retval = tnode.getAttribute("xmlns:" + type_defn[0]);
                        tnode = tnode.parentNode;
                    }
                    else {
                        break;
                    }
                }
            }

            qx.core.Assert.assertNotEquals(retval, null,
                        "Unable to deduce namespace of '" + type_qname +
                                                            "' from xml file!");

            return retval;
        }

        ,createSubElementNS: function(doc, parent, name, ns) {
            var retval;

            if (qx.core.Variant.isSet("qx.client", "mshtml")) {
                retval = doc.createNode(1, name, ns);
            }
            else {
                /*

                var a = qx.xml.Document.create();
                var b = a.createElementNS("namespace1", "tag1");
                var c = a.createElementNS("namespace1", "tag2");
                var d = a.createElementNS("namespace1", "tag3");
                var e = a.createElementNS("namespace2", "tag4");

                a.appendChild(b)
                b.appendChild(c);
                b.appendChild(d);
                b.appendChild(e);

                qx.xml.Element.serialize(a);

                //////////////////////////////////////////////////

                var a = qx.xml.Document.create();
                var b = a.createElementNS("namespace1", "x:tag1");
                var c = a.createElementNS("namespace2", "x:tag2");
                var d = a.createElementNS("namespace2", "x:tag3");
                var e = a.createElementNS("namespace3", "x:tag4");

                a.appendChild(b)
                b.appendChild(c);
                b.appendChild(d);
                b.appendChild(e);

                qx.xml.Element.serialize(a);

                */

                // the "x" prefix has no importance. when there's a conflict,
                // mozilla engine assigns an alternative prefix automatically.
                // not putting a prefix means to assign default namespace prefix
                // to the given namespace uri.
                retval = doc.createElementNS(ns, "x:" + name);
            }

            parent.appendChild(retval);

            return retval;
        }
    }

    ,members : {
         cache : null

        ,get_call: function(method_name) {
            var retval = new soap.Call();

            retval.set_client(this);
            retval.set_name(method_name);
            retval.set_params(new soap.Parameters());

            return retval;
        }

        ,get_object: function(object_namespace, object_name) {
            return this.cache.get_object(object_namespace, object_name);
        }
        
        ,easy : function (method_name) {
            if (! method_name) {
                throw new Error("method_name must be defined!");
            }

            var ctx=this;
            var ctx_args = arguments;

            if(this.cache == null) {
                var xhr = qx.io.remote.transport.XmlHttp.createRequestObject();
                xhr.open("GET", this.get_url() + "?wsdl", true);

                xhr.onreadystatechange = function() {
                    if(xhr.readyState == 4) {
                        var wsdl = xhr.responseXML;
                        if (wsdl == null) {
                            ctx.dispatchEvent(new qx.io.remote.Response(
                                                                "wsdl_failed"));
                            return;
                        }
                        else {
                            ctx.cache = new soap.WsdlCache(wsdl);
                            ctx.easy.apply(ctx,ctx_args);
                        }
                    }
                }

                return xhr.send(null);
            }

            var tns = ctx.cache.get_target_namespace();
            var method_input = ctx.cache.schema[tns].complex[method_name];
            if (! method_input) {
                throw new Error("Method named '" + method_name +
                                                  "' is not exposed via wsdl.");
            }

            /* this block completes callback and errback assignments:
             * if the last argument is a function, is the callback.
             * if the last two arguments are functions, the last one is the
             * errback and the one before that is the callback.
             */
            var l = arguments.length;
            var callback, errback;
            if (arguments[l-1] instanceof Function) {
                callback = arguments[l-1];
                --l;

                if (arguments[l-1] instanceof Function) {
                    callback = arguments[l-1];
                    errback = arguments[l];
                    --l;
                }
            }

            var args = new soap.Parameters();
            for (var i=1; i<l; ++i) {
                var child_type = method_input.children[i-1];

                if (! child_type) {
                    throw new Error("Too many arguments for function '"
                                                              +method_name+"'");
                }

                args.add(method_input.children[i-1].name, arguments[i]);
            }

            return this.__invoke(method_name, args, true, false, callback,
                                                                       errback);
        }

        ,__extract_fault : function(method_name, async, simple, req) {
            var retval = null;

            if(req.responseXML.getElementsByTagName("faultcode").length > 0) {
                var fault_string  = req.responseXML.getElementsByTagName(
                                      "faultstring")[0].childNodes[0].nodeValue;
                var node = req.responseXML.getElementsByTagName("detail")[0];
                fault_string += "\nDetail:\n\n" + node.childNodes[0].nodeValue;
                retval = new Error(500, fault_string);
                if (! async) {
                    throw retval;
                }
            }
            else {
                retval = new Error("No fautstring was found!");
                if (! async) {
                    throw retval;
                }
            }
            return retval;
        }

        ,__on_send_soap_request : function(method_name, async, simple, callback,
                                                               errorback, req) {
            var retval = null;

            if (req.responseXML == null) {
                this.dispatchEvent(new qx.io.remote.Response("failed"));
            }
            else {
                // get the response type for the method named method_name
                var tag_name = this.cache.methods[method_name].output.name

                if(tag_name == null) {
                    retval = this.__extract_fault(method_name,async,simple,req);
                }
                else {
                    var nd = req.responseXML.getElementsByTagName(tag_name);
                    if (nd == null || nd.length == 0) {
                        var tns = this.cache.get_target_namespace();
                        nd = qx.xml.Element.getElementsByTagNameNS(
                                                req.responseXML, tns, tag_name);
                    }

                    if(nd == null || nd.length == 0) {
                        retval = this.__extract_fault(method_name, async,
                                                                   simple, req);
                    }
                    else {
                        retval = this.__to_object(nd[0], simple);
                    }
                }

                if (retval instanceof Error) {
                    if (errorback) {
                        errorback(retval, req.responseXML);
                    }
                    else {
                        var msg = this.tr("An error has occurred!") + "\n"
                                        + retval.fileName + "\n";
                                        //+ ">>> " + retval.lineNumber;

                        alert(msg);
                    }
                }
                else {
                    if(callback) {
                        callback(retval, req.responseXML);
                    }
                }
            }

            return retval;
        }

        ,__to_object : function(node, simple) {
            var retval = null;
            var k;

            retval = this.__extract(node, simple);

            // one-level-deeper-than-expected hack
            if (simple) {
                for (k in retval) {
                    if (retval.hasOwnProperty(k)) {
                        return retval[k];
                    }
                }
            }
            else {
                var props = qx.util.PropertyUtil.getProperties(
                                                            retval.constructor);
                for (k in props) {
                    if (props.hasOwnProperty(k)) {
                        return retval["get" + k]();
                    }
                }
            }

            return retval;
        }

        ,__get_ns_from_node : function(node) {
            var retval;
            var type_qname = this.__get_type_name_from_node(node)
            retval = soap.Client.type_qname_to_ns(node, type_qname);
            
            if (retval == null) {
                retval = node.namespaceURI;
            }

            if (retval == null) {
                retval = this.cache.get_target_namespace();
            }

            return retval;
        }

        ,__get_type_name_from_node : function(node) {
            var retval = node.getAttribute("type");

            if (retval == null) {
                retval = node.getAttribute("xsi:type");
            }
            if (retval == null) {
                retval = node.nodeName;
            }

            return retval;
        }

        ,__extract : function(node, simple, parent_defn) {
            var retval = null;
            var _ns_xsd = "http://www.w3.org/2001/XMLSchema";

            var is_null = node.getAttribute("xsi:nil");
            if (is_null == "true") {
                return null;
            }

            var type_name = this.__get_type_name_from_node(node);
            var type_ns = this.__get_ns_from_node(node);
            
            var type_local = type_name.split(":")[1];
            var type_local_l = type_local.toLowerCase();

            if (type_local_l != "string" && value == "") {
                return null;
            }

            if (type_ns == _ns_xsd) {
                var value = node.nodeValue;
                if (value == null) {
                    var first_child = node.firstChild;
                    if (first_child == null) {
                        value = "";
                    }
                    else {
                        value = first_child.nodeValue; // this is to get the textNode
                    }
                }

                if (type_local_l != "string" && value === "") {
                    retval = null;
                }
                else if (type_local_l == "boolean") {
                    retval = value + "" == "true";
                }
                else if (type_local_l == "int" || type_local_l == "long"
                            || type_local_l == "integer") {
                    retval = (value != null) ? parseInt(value + "", 10) : 0;
                }
                else if (type_local_l == "double" || type_local_l == "float") {
                    retval = (value != null) ? parseFloat(value + "") : 0.0;
                }
                else if (type_local_l == "datetime") {
                    if (value != null) {
                        value = value + "";
                        value = value.substring(0, (
                            value.lastIndexOf(".") == -1 ? (
                                value.lastIndexOf("+") == -1 ?
                                value.length :
                                value.lastIndexOf("+")
                            ) :
                            value.lastIndexOf(".")));

                        value = value.replace(/T/gi," ");
                        value = value.replace(/-/gi,"/");
                        retval = new Date();
                        retval.setTime(Date.parse(value));
                    }
                }
                else if (type_local_l == "string") {
                    retval = (value != null) ? value + "" : null;
                }
                else if (type_local_l == "anytype") {
                    retval = node;
                }
            }
            else { // it's a complex type
                var i,l;

                // fetch the type definition from the wsdl using info in the
                // soap request.
                var defn = this.cache.schema[type_ns].complex[type_local];

                // if the definition can't be found, fetch the definition using
                // the children list in the parent's wsdl declaration.
                if (! defn) {
                    if (! parent_defn) {
                        var parent_type_name = this.__get_type_name_from_node(
                                                               node.parentNode);
                        var parent_ns = this.__get_ns_from_node(node.parentNode);
                        var parent_local = parent_type_name.split(":")[1];

                        var parent_schema = this.cache.schema[parent_ns]
                        parent_defn = parent_schema.complex[parent_local];
                    }

                    type_name = parent_defn.children[type_local].type;
                    type_ns = soap.Client.type_qname_to_ns(node, type_name)
                    type_local = type_name.split(":")[1];

                    defn = this.cache.schema[type_ns].complex[type_local];
                }

                if (defn.is_array) {
                    retval = new Array();

                    for (i=0, l=node.childNodes.length; i<l; i++) {
                        retval.push(this.__extract(node.childNodes[i],simple,
                                                                         defn));
                    }
                }
                else {
                    if (simple) {
                        retval = new Object();
                    }
                    else {
                        retval = this.get_object(type_ns, type_local);
                    }

                    for (i=0,l=node.childNodes.length; i<l; ++i) {
                        var val;
                        var n = node.childNodes[i];
                        var nn = n.localName;

                        is_null = n.getAttribute("xs:nil");
                        if (is_null == "1") {
                            val = null;
                        }
                        else {
                            val = this.__extract(n, simple, defn);
                        }

                        if (simple) {
                            retval[nn] =val;
                        }
                        else {
                            var setter = "set_" + nn;
                            retval[setter](val);
                        }
                    }
                }
            }

            return retval;
        }

        ,callAsync : function(method_name, args, simple, callback, errback) {
            return this.__invoke(method_name, args, true, simple, callback,
                                                                       errback);
        }

        ,__invoke : function(method_name, parameters, async, simple, callback,
                                                                      errback) {
            var retval;
            
            if(async) {
                this.__load_wsdl(method_name, parameters, async, simple,
                                                             callback, errback);
            }
            else {
                retval = this.__load_wsdl(method_name, parameters, async, simple,
                                                             callback, errback);
            }

            return retval;
        }

        // private: invoke async
        ,__load_wsdl : function(method_, parameters, async, simple, callback,
                                                                      errback) {
            var retval;
            
            if(this.cache == null) {
                var xmlHttp = qx.io.remote.transport.XmlHttp.createRequestObject();
                xmlHttp.open("GET", this.get_url() + "?wsdl", async);
                if(async) {
                    var ctx=this;
                    xmlHttp.onreadystatechange = function() {
                        if(xmlHttp.readyState == 4) {
                            ctx.__on_load_wsdl(method_, parameters, async, 
                                            simple, callback, errback, xmlHttp);
                        }
                    }
                }

                xmlHttp.send(null);
                if (!async) {
                    retval = this.__on_load_wsdl(method_, parameters, async, 
                                        simple, callback, errback, xmlHttp);
                }
            }
            else {
                retval = this.__send_soap_request(method_, parameters, async, 
                                                    simple, callback, errback);
            }

            return retval;
        }

        ,__on_load_wsdl : function(method_, parameters, async, simple, callback,
                                                                 errback, req) {
            var wsdl = req.responseXML;
            var retval;

            if (wsdl == null) {
                this.dispatchEvent(new qx.io.remote.Response("wsdl_failed"));
            }
            else {
                this.cache = new soap.WsdlCache(wsdl);
                retval = this.__send_soap_request(method_, parameters, async,
                                                     simple, callback, errback);
            }

            return retval;
        }

        ,__send_soap_request : function(method_, parameters, async, simple,
                                                            callback, errback) {
            var sub_element = soap.Client.createSubElementNS;
            var retval;

            var _ns_soap = "http://schemas.xmlsoap.org/soap/envelope/"
            var _ns_tns = this.cache.get_target_namespace();

            // build SOAP request
            var doc = qx.xml.Document.create()
            var envelope = sub_element(doc, doc,"Envelope", _ns_soap);

            var body = sub_element(doc, envelope, "Body", _ns_soap);
            var call = sub_element(doc, body, method_, _ns_tns);
            parameters.to_xml(doc, call, this.cache);

            // send request
            var xml_http = qx.io.remote.transport.XmlHttp.createRequestObject();
            xml_http.open("POST", this.get_url(), async);

            var soapaction = ((_ns_tns.lastIndexOf("/") != _ns_tns.length - 1) ?
                                             _ns_tns + "/" : _ns_tns) + method_;
            xml_http.setRequestHeader("SOAPAction", soapaction);
            xml_http.setRequestHeader("Content-Type", "text/xml; charset=utf-8");

            if(async) {
                var ctx = this;
                xml_http.onreadystatechange = function() {
                    if(xml_http.readyState == 4) { /* FIXME: No magic numbers! */
                        ctx.__on_send_soap_request(method_, async, simple,
                                                    callback, errback, xml_http);
                    }
                }
            }

            xml_http.send(qx.xml.Element.serialize(doc));
            if (!async) {
                retval = this.__on_send_soap_request(method_, async, simple,
                                                    callback, errback, xml_http);
            }

            return retval;
        }
    }
});
