
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
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SeasyOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

qx.Class.define("soap.Client", {extend : qx.core.Object
    ,include : [qx.locale.MTranslation]
    ,properties : {
         _url : {check : "String"}
        ,_header_class : {check: "Function"}
    }

    ,statics : {
        TYPE_MAP : {
             "boolean": "Boolean"

            ,"double": "Number"
            ,"float": "Number"
            ,"decimal": "Number"
            ,"byte": "Number"
            ,"unsignedbyte": "Number"
            ,"short": "Number"
            ,"unsignedshort": "Number"
            ,"int": "Integer"
            ,"unsignedint": "Number"
            ,"long": "Number"
            ,"unsignedlong": "Number"
            ,"integer": "Integer"
            ,"nonnegativeinteger": "Number"

            ,"time": "Date"
            ,"datetime": "Date"
            ,"string" : "String"
            ,"anytype": "Document"
            ,"base64binary": "String"
        }
        ,NS_SOAP_ENV: "http://schemas.xmlsoap.org/soap/envelope/"

        // http://msmvps.com/blogs/martin_honnen/archive/2009/04/15/creating-xml-with-namespaces-with-javascript-and-msxml.aspx
        ,setAttributeNS: function(doc, node, name, ns, value) {
            if ((qx.core.Environment.get("engine.name") === "mshtml")) {
                var attr = doc.createNode(2, name, ns);
                attr.nodeValue = value;
                node.setAttributeNode(attr);
            }
            else {
                node.setAttributeNS(ns, name, value);
            }
        }

        ,createSubElementNS: function(doc, parent, name, ns) {
            var retval;

            if ((qx.core.Environment.get("engine.name") === "mshtml")) {
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
                var pref =  soap.WsdlCache.nsmap[ns] || 'x';
                retval = doc.createElementNS(ns, pref + ":" + name);
            }

            parent.appendChild(retval);

            return retval;
        }

        ,parse_time: function(value) {
            value = value + "";

            var time = value.match(/(\d\d):(\d\d):(\d\d)(\.\d+)?/);

            var retval = new Date();
            retval.setYear(0);
            retval.setMonth(0);
            retval.setDate(0);
            retval.setHours( parseInt(time[1]) );
            retval.setMinutes( parseInt(time[2]) );
            retval.setSeconds( parseInt(time[3]) );

            return retval;
        }

        // http://n8v.enteuxis.org/2010/12/parsing-iso-8601-dates-in-javascript/
        ,parse_datetime_isoformat : function(value) {
            // parenthese matches:
            // year month day    hours minutes seconds
            // dotmilliseconds
            // tzstring plusminus hours minutes
            var re = /(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(\.\d+)?(Z|([+-])?(\d\d)?:?(\d\d)?)/;

            var d = [];
            d = value.match(re);

            // "2010-12-07T11:00:00.000-09:00" parses to:
            //  ["2010-12-07T11:00:00.000-09:00", "2010", "12", "07", "11",
            //     "00", "00", ".000", "-09:00", "-", "09", "00"]
            // "2010-12-07T11:00:00.000Z" parses to:
            //  ["2010-12-07T11:00:00.000Z",      "2010", "12", "07", "11",
            //     "00", "00", ".000", "Z", undefined, undefined, undefined]

            if (! d) {
                return new Date(Date.parse(value));
            }

            // parse strings, leading zeros into proper ints
            var a = [1,2,3,4,5,6,10,11];
            for (var i in a) {
                d[a[i]] = parseInt(d[a[i]], 10);
            }
            d[7] = parseFloat(d[7]);

            // Date.UTC(year, month[, date[, hrs[, min[, sec[, ms]]]]])
            // note that month is 0-11, not 1-12
            // see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date/UTC
            var ms = Date.UTC(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);

            // if there are milliseconds, add them
            if (d[7] > 0) {
                ms += Math.round(d[7] * 1000);
            }

            // if there's a timezone, calculate it
            var offset;
            if (d[8] == "Z") {
                offset = 0;
            }
            else if (d[10]) {
                offset = d[10] * 60 * 60 * 1000;
                if (d[11]) {
                    offset += d[11] * 60 * 1000;
                }
                if (d[9] == "-") {
                    offset = -1 * offset;
                }
            }

            var retval = new Date(ms);
            if (offset || offset === 0) {
                ms += offset + (retval.getTimezoneOffset() * 60000);
            }

            return new Date(retval.getTime() + (retval.getTimezoneOffset() * 60000));
        }

        ,from_string: function(type_name, value) {
            var retval;
            var type_name_l = type_name.toLowerCase();

            if (value === null) {
                return retval;
            }
            else if (type_name_l != "string" && value === "") {
                retval = null;
            }
            else if (type_name_l == "boolean") {
                retval = value + "" == "true";
            }
            else if (type_name_l == "integer" || type_name_l == "nonnegativeinteger" ||
                     type_name_l == "long" || type_name_l == "unsignedlong" ||
                     type_name_l == "int" || type_name_l == "unsignedint" ||
                     type_name_l == "short" || type_name_l == "unsignedshort" ||
                     type_name_l == "byte" || type_name_l == "unsignedbyte"
                    ) {
                retval = parseInt(value + "", 10);
            }
            else if (type_name_l == "double" || type_name_l == "float") {
                retval = parseFloat(value + "");
            }
            else if (type_name_l == "decimal") {
                retval = Number(value + "");
            }
            else if (type_name_l == "datetime") {
                retval = soap.Client.parse_datetime_isoformat(value);
            }
            else if (type_name_l == "time") {
                retval = soap.Client.parse_time(value);
            }
            else if (type_name_l == "string" || type_name_l == "base64binary") {
                retval = value + "";
            }
            else {
                qx.log.Logger.debug("Unrecognized type '" + type_name + "'");
            }

            return retval;
        }

    }

    ,construct : function(url, header_class) {
        this.base(arguments);

        this.set_url(url);
        this.__queue = soap.CallQueue.getInstance();

        if (header_class) {
            this.set_header_class(header_class);
        }
        else {
            this.set_header_class(soap.RequestHeader);
        }
    }

    ,events : {
        "failed" : "qx.event.type.Event",
        "wsdl_failed" : "qx.event.type.Event"
    }

    ,members : {
         cache : null
        ,__queue : null

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

        ,__easy : function (method_name) {
            if (! method_name) {
                throw new Error("method_name must be defined!");
            }

            var ctx = this;
            var ctx_args = arguments;

            /* this block completes callback and errback assignments:
             * if the last argument is a function, it is the callback.
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

            if(this.cache == null) {
                var xhr = qx.io.remote.transport.XmlHttp.createRequestObject();
                xhr.open("GET", this.get_url() + "?wsdl", true);

                xhr.onreadystatechange = function() {
                    if(xhr.readyState == 4) {
                        var wsdl = xhr.responseXML;
                        if (wsdl == null) {
                            ctx.dispatchEvent(new qx.io.remote.Response(
                                                                "wsdl_failed"));
                            if (errback) {
                                errback();
                            }
                            return;
                        }
                        else {
                            ctx.cache = new soap.WsdlCache(wsdl, ctx);
                            if (callback) {
                                callback();
                            }
                            ctx.easy.apply(ctx, ctx_args);
                        }
                    }
                }

                return xhr.send(null);
            }

            if (method_name == '!_wsdl_!') {
                return;
            }

            var tns = ctx.cache.get_target_namespace();
            var method_input = ctx.cache.schema[tns].complex[method_name];
            if (! method_input) {
                throw new Error("Method named '" + method_name +
                                                  "' is not exposed via wsdl.");
            }

            var args = new soap.Parameters();
            for (var i=1; i<l; ++i) {
                var child_type = method_input.children[i-1];

                if (! child_type) {
                    throw new Error("Too many arguments for function '"
                                                           + method_name + "'");
                }

                args.add(method_input.children[i-1].name, arguments[i]);
            }

            return [args, callback, errback]
        }

        ,alter_args: function(args) {

        }

        ,easy: function() {
            var ret = this.__easy.apply(this, arguments);
            if (ret) {
                this.callAsync(arguments[0], ret[0], false, false, ret[1], ret[2]);
            }
        }

        ,simple: function() {
            var ret = this.__easy.apply(this, arguments);
            if (ret) {
                this.callAsync(arguments[0], ret[0], true, true, ret[1], ret[2]);
            }
        }

        ,easy_deferred: function() {
            var ret = this.__easy.apply(this, arguments);

            var call = this.get_call(arguments[0]);
            call.set_client(this);
            call.set_params(ret[0]);
            call.set_simple(false);
            call.set_callback(ret[1]);
            call.set_errback(ret[2]);
            this.__queue.add(call);
        }

        ,flush: function() {
            this.__queue.flush();
        }

        ,__extract_fault : function(method_name, async, simple, req) {
            var retval = null;
            var ret = req.responseXML.getElementsByTagName('faultcode');

            if(ret.length > 0) {
                var fault_string  = req.responseXML.getElementsByTagName(
                                      'faultstring')[0].childNodes[0].nodeValue;
                if ((qx.core.Environment.get("engine.name") === "mshtml")) {
                    retval = new Error(500, fault_string);
                }
                else if ((qx.core.Environment.get("engine.name") === "gecko")) {
                    retval = new Error(500, fault_string);
                }
                else {
                    retval = new Error(fault_string);
                }
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
                var output = this.cache.methods[method_name].output
                var tag_name = output.name
                var tag_ns =output.ns

                if(tag_name == null) {
                    retval = this.__extract_fault(method_name,async,simple,req);
                }
                else {
                    var nd = qx.xml.Element.getElementsByTagNameNS(
                                            req.responseXML, tag_ns, tag_name);

                    if(nd == null || nd.length == 0) {
                        nd = qx.xml.Element.getElementsByTagNameNS(
                            req.responseXML, soap.Client.NS_SOAP_ENV, "Fault");

                        if(! (nd == null || nd.length == 0)) {
                            retval = this.__extract_fault(method_name, async,
                                                                   simple, req);
                        }
                        else {
                            retval = Error("Invalid input!")
                        }
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
                        var msg = this.tr("A '") + retval.name +
                            this.tr("' has occurred!") + "\n" +
                            retval.message + "\n" +
                            retval.fileName + "\n";

                        if ((qx.core.Environment.get("qx.debug"))) {
                            msg += retval.lineNumber + "\n\n" + retval.stack;
                        }

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

            var local;
            if ((qx.core.Environment.get("engine.name") === "mshtml")) {
                local = node.baseName;
            }
            else {
                local = node.localName;
            }

            var defn = this.cache.schema[node.namespaceURI].complex[local]
            retval = this.__extract(node, simple, defn);

            // one-level-deeper-than-expected hack
            if (simple) {
                for (k in retval) {
                    if (retval.hasOwnProperty(k)) {
                        return retval[k];
                    }
                }
            }
            else {
                if (retval !== null) {
                    var props = qx.util.PropertyUtil.getAllProperties(
                                                            retval.constructor);
                    for (k in props) {
                        if (props.hasOwnProperty(k)) {
                            return retval["get" + k]();
                        }
                    }
                }
            }

            return retval;
        }

        ,__is_simple_type : function(type_ns, type_local) {
            var _ns_xsd = "http://www.w3.org/2001/XMLSchema";
            var retval = (type_ns == _ns_xsd);

            if (! retval) {
                var s = this.cache.schema[type_ns]
                if (s) {
                    retval = s.simple[type_local]
                }
            }

            return retval;
        }

        ,__get_child_defn: function(defn, child_name) {
            var child_ns = defn.children[child_name].ns
            var child_type = defn.children[child_name].type
            var child_type_local = child_type.split(':')[1]

            var retval = this.cache.schema[child_ns];
            if (retval) {
                 retval = retval.complex[child_type_local] ||
                                            retval.simple[child_type_local];
            }
            return retval;
        }

        ,__extract : function(node, simple, defn, type_name, type_ns) {
            var retval = null;

            var is_null = node.getAttribute("xsi:nil");
            if (is_null == "true") {
                return null;
            }

            if (! type_name) {
                if (! defn) {
                    return null;
                }
                type_name = defn.type;
                if (type_name) {
                    type_name = type_name.split(':')[1];
                }
                else {
                    type_name = defn.name;
                }
                type_ns = defn.ns;
            }

            var ret = this.__is_simple_type(type_ns, type_name);
            if (ret) {
                if (ret !== true) {
                    type_name = ret.base.split(':')[1];
                    type_ns = ret.base_ns;
                    while (type_ns != "http://www.w3.org/2001/XMLSchema") {
                        var s = this.cache.schema[type_ns]
                        if (s) {
                            ret = s.simple[type_name]
                        }
                        type_name = ret.base.split(':')[1];
                        type_ns = ret.base_ns;
                    }
                }

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

                if (type_name == "anyType") {
                    retval = node;
                }
                else {
                    retval = soap.Client.from_string(type_name, value);
                }
            }
            else { // it's a complex type
                var i,l;

                if (defn.is_array) {
                    retval = new Array();

                    var child_defn = this.__get_child_defn(defn, 0);
                    for (i=0, l=node.childNodes.length; i<l; i++) {
                        val = this.__extract(node.childNodes[i],simple,
                                        child_defn,
                                        defn.children[0].type.split(":")[1],
                                        defn.children[0].ns);
                        retval.push(val);
                    }
                }
                else {
                    if (simple) {
                        retval = new Object();
                    }
                    else {
                        retval = this.get_object(type_ns, type_name);
                    }

                    for (i=0,l=node.childNodes.length; i<l; ++i) {
                        var val;
                        var n = node.childNodes[i];
                        var nn;

                        if ((qx.core.Environment.get("engine.name") === "mshtml")) {
                            nn = n.baseName;
                        }
                        else {
                            nn = n.localName;
                        }

                        is_null = n.getAttribute("xs:nil");
                        if (is_null == "1") {
                            val = null;
                        }
                        else {
                            child_defn = this.__get_child_defn(defn, nn);
                            val = this.__extract(n, simple, child_defn,
                                        defn.children[nn].type.split(":")[1],
                                        defn.children[nn].ns);
                        }
                        if (defn.children[nn].is_simple_array) {
                            if (simple) {
                                if (retval[nn]) {
                                    retval[nn].push(val)
                                }
                                else {
                                    retval[nn] = [val];
                                }
                            }
                            else {
                                var _val = retval["get_" + nn]();
                                if (_val) {
                                    _val.push(val);
                                }
                                else {
                                    retval["set_" + nn]([val]);
                                }
                            }
                        }
                        else {
                            if (simple) {
                                retval[nn] = val;
                            }
                            else {
                                var setter = "set_" + nn;
                                retval[setter](val);
                            }
                        }
                    }
                }
            }

            return retval;
        }

        ,callAsync : function(method_name, args, simple_request,
                                            simple_response, callback, errback) {
            return this.__invoke(method_name, args, true, simple_request,
                                            simple_response, callback, errback);
        }

        ,__invoke : function(method_name, parameters, async, 
                            simple_request, simple_response, callback, errback) {
            var retval;
            this.alter_args(parameters, simple_request);

            if(async) {
                this.__load_wsdl(method_name, parameters, async,
                            simple_request, simple_response, callback, errback);
            }
            else {
                retval = this.__load_wsdl(method_name, parameters, async,
                            simple_request, simple_response, callback, errback);
            }

            return retval;
        }

        ,__load_wsdl : function(method_, parameters, async,
                           simple_request, simple_response, callback, errback) {
            var retval;

            if(this.cache == null) {
                var xmlHttp = qx.io.remote.transport.XmlHttp.createRequestObject();
                xmlHttp.open("GET", this.get_url() + "?wsdl", async);
                if(async) {
                    var ctx=this;
                    xmlHttp.onreadystatechange = function() {
                        if(xmlHttp.readyState == 4) {
                            ctx.__on_load_wsdl(method_, parameters, async,
                                            simple_request, simple_response,
                                            callback, errback, xmlHttp);
                        }
                    }
                }

                xmlHttp.send(null);
                if (!async) {
                    retval = this.__on_load_wsdl(method_, parameters, async,
                                                simple_request, simple_response,
                                                callback, errback, xmlHttp);
                }
            }
            else {
                retval = this.__send_soap_request(method_, parameters, async,
                            simple_request, simple_response, callback, errback);
            }

            return retval;
        }

        ,__on_load_wsdl : function(method_, parameters, async, simple_request,
                                      simple_response, callback, errback, req) {
            var wsdl = req.responseXML;
            var retval;

            if (wsdl == null) {
                this.dispatchEvent(new qx.io.remote.Response("wsdl_failed"));
            }
            else {
                this.cache = new soap.WsdlCache(wsdl);
                retval = this.__send_soap_request(method_, parameters, async,
                            simple_request, simple_response, callback, errback);
            }

            return retval;
        }

        ,__send_soap_request : function(method_name, parameters, async,
                            simple_request, simple_response, callback, errback) {
            var _ns_tns = this.cache.get_target_namespace();

            var sub_element = soap.Client.createSubElementNS;
            var retval;

            // build SOAP request
            var doc = qx.xml.Document.create()
            var envelope = sub_element(doc, doc,"Envelope",
                                                       soap.Client.NS_SOAP_ENV);
            parameters.to_xml(doc, envelope, this.cache, method_name, simple_request);

            // send request
            var xml_http = qx.io.remote.transport.XmlHttp.createRequestObject();
            xml_http.open("POST", this.get_url(), async);

            var soapaction = ((_ns_tns.lastIndexOf("/") != _ns_tns.length - 1) ?
                                         _ns_tns + "/" : _ns_tns) + method_name;
            xml_http.setRequestHeader("SOAPAction", soapaction);
            xml_http.setRequestHeader("Content-Type", "text/xml; charset=utf-8");

            if(async) {
                var ctx = this;
                xml_http.onreadystatechange = function() {
                    if(xml_http.readyState == 4) { /* FIXME: No magic numbers! */
                        ctx.__on_send_soap_request(method_name, async, simple_response,
                                                    callback, errback, xml_http);
                    }
                }
            }

            xml_http.send(qx.xml.Element.serialize(doc));
            if (!async) {
                retval = this.__on_send_soap_request(method_name, async, simple_response,
                                                    callback, errback, xml_http);
            }

            return retval;
        }
    }
});
