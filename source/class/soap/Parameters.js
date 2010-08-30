
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

qx.Class.define("soap.Parameters", {extend : qx.core.Object
    ,include : [qx.locale.MTranslation]
    ,construct : function() {
        this.__pl = new Object();
    }

    ,properties : {
        _soap_req_header : {init: null, nullable: true}
    }

    ,members : {
        __pl : null

        ,__decode_array : function(doc, parent, value, cache, parent_defn) {
            var child_name = parent_defn.children[0].name;
            var child_defn = this.__get_child_defn(parent_defn,cache,0);
            for (var i=0, l=value.length; i<l; ++i) {
                var ns = parent_defn.children[child_name].ns;
                if (ns == 'http://www.w3.org/2001/XMLSchema') {
                    ns = cache.get_target_namespace()
                }

                var child = soap.Client.createSubElementNS(doc, parent,
                                                                child_name, ns);

                this.__serialize(doc, child, value[i], cache, child_defn);
            }
        }

        ,__get_child_defn: function(parent_defn, cache, child_name) {
            var child_defn = parent_defn.children[child_name]
            var defn = parent_defn;
            while ( defn.base && (! child_defn)) {
                defn = cache.schema[defn.base_ns].complex[defn.base];
                child_defn = defn.children[child_name];
            }

            var type_name = child_defn.type
            var type_ns = child_defn.ns
            var type_local = type_name.split(":")[1];

            var retval = null;
            if (cache.schema[type_ns]) {
                retval = cache.schema[type_ns].complex[type_local];
            }

            return retval;
        }

        ,__decode_object: function(doc, parent, value, cache, parent_defn) {
            if (value instanceof qx.locale.LocalizedString) {
                parent.appendChild(doc.createTextNode(value.toString()));
            }
            else if (value instanceof Date) {
                var year = value.getFullYear().toString();
                var month = (value.getMonth() + 1).toString();

                month = (month.length == 1) ? "0" + month : month;

                var date = value.getDate().toString();
                date = (date.length == 1) ? "0" + date : date;

                var hours = value.getHours().toString();
                hours = (hours.length == 1) ? "0" + hours : hours;

                var minutes = value.getMinutes().toString();
                minutes = (minutes.length == 1) ? "0" + minutes : minutes;

                var seconds = value.getSeconds().toString();
                seconds = (seconds.length == 1) ? "0" + seconds : seconds;

                var miliseconds = value.getMilliseconds().toString();
                while (miliseconds.length < 3) {
                    miliseconds = "0" + miliseconds;
                }

                var tzminutes = Math.abs(value.getTimezoneOffset());
                var tzhours = 0;

                while(tzminutes >= 60) {
                    tzhours++;
                    tzminutes -= 60;
                }
                tzminutes = (tzminutes.toString().length == 1) ?
                              "0" + tzminutes.toString() : tzminutes.toString();
                tzhours = (tzhours.toString().length == 1) ? "0" +
                                        tzhours.toString() : tzhours.toString();
                var timezone = ((value.getTimezoneOffset() < 0) ? "+" : "-")
                                                    + tzhours + ":" + tzminutes;

                value = year + "-" + month + "-" + date + "T"
                        + hours + ":" + minutes + ":" + seconds + "."
                        + miliseconds + timezone;

                parent.appendChild(doc.createTextNode(value));
            }
            else if (value instanceof Number) {
                parent.appendChild(doc.createTextNode(value.toString()));
            }
            else if(value instanceof Array) {
                this.__decode_array(doc, parent, value, cache, parent_defn);
            }
            else if (qx.xml.Document.isXmlDocument(value)) {
                try {
                    parent.appendChild(value);
                }
                catch (e) {
                    var cloned_node = value;
                    if (value.ownerDocument) {
                        if (value.ownerDocument.importNode) {
                            cloned_node = parent.ownerDocument.importNode(value,true);
                        }
                        else {
                            cloned_node = parent.ownerDocument.cloneNode(true);
                        }
                    }
                    parent.appendChild(cloned_node);
                }
            }
            else { // Object or custom function
                var ctx = this;

                var prop_rec = function (cls, defn) {
                    if (defn.base) {
                        var super_defn = cache.schema[defn.base_ns].complex[defn.base];
                        prop_rec(cls.superclass, super_defn);
                    }

                    var i=0;
                    if (defn.children) {
                        var cd=defn.children[i];
                        while (cd) {
                            ctx.__decode_object_member(doc, parent, value,
                                                    cache, defn, "_" + cd.name);

                            cd=defn.children[++i];
                        }
                    }
                }

                prop_rec(value.constructor, parent_defn);
            }
        }

        ,__serialize : function(doc, parent, value, cache, parent_defn) {
            var t = typeof(value);
            var _ns_xsi = "http://www.w3.org/2001/XMLSchema-instance"

            if (value == null) {
                soap.Client.setAttributeNS(doc, parent, "xsi:nil", _ns_xsi, 1);
            }
            else if (t == "string") {
                parent.appendChild(doc.createTextNode(value));
            }
            else if (t == "number" || t == "boolean") {
                parent.appendChild(doc.createTextNode(value.toString()));
            }
            else if (t == "object") {
                this.__decode_object(doc, parent, value, cache, parent_defn);
            }
        }

        ,__decode_object_member: function(doc, parent, value, cache,
                                                            parent_defn, name) {
            var getter = "get" + name;
            var key = name.slice(1);
            var data = value[getter]();

            var child_defn;
            var td = eval(value.classname).TYPE_DEFINITION, ns;
            if (td) {
                ns = td.ns;
                child_defn = this.__get_child_defn(parent_defn, cache, key);
            }
            else {
                ns = "qxsoap.internal";
            }

            var child = soap.Client.createSubElementNS(doc, parent, key, ns);

            /*
            if (child_defn) {
                var _ns_xsi = "http://www.w3.org/2001/XMLSchema-instance"
                soap.Client.setAttributeNS(doc, child, "xsi:type", _ns_xsi,
                    cache.schema[child_defn.ns].element[child_defn.name].type);
            }
            */

            this.__serialize(doc, child, data, cache, child_defn);
        }

        ,add : function(name, value) {
            if (value == null || value + "" == "undefined") {
                return this;
            }

            this.__pl[name] = value;
            return this;
        }

        ,get_argument : function(name) {
            return this.__pl[name];
        }

        ,to_xml : function(doc, parent, cache, method_name) {
            var _ns_soap = "http://schemas.xmlsoap.org/soap/envelope/"
            var _ns_tns = cache.get_target_namespace();
            var sub_element = soap.Client.createSubElementNS;
            var child_defn;

            var soap_req_header = this.get_soap_req_header();
            if (soap_req_header != null) {
                var header = sub_element(doc, parent, "Header", _ns_soap);
                var ns = eval(soap_req_header.classname).TYPE_DEFINITION.ns

                child_defn = cache.schema[ns].complex[soap_req_header.basename];

                var object = sub_element(doc, header, soap_req_header.basename,
                                                                            ns);

                this.__serialize(doc, object, soap_req_header, cache,
                                                                    child_defn);
            }

            var body = sub_element(doc, parent, "Body", _ns_soap);
            var call = sub_element(doc, body, method_name, _ns_tns);
            var parent_defn = cache.schema[_ns_tns].complex[method_name];

            var i=0;
            if (parent_defn.children) {
                var cd=parent_defn.children[i];
                while (cd) {
                    var name = cd.name;
                    var child = soap.Client.createSubElementNS(doc, call,
                                                name, cache.get_target_namespace());

                    child_defn = this.__get_child_defn(parent_defn, cache, name);

                    /*
                    if (child_defn) {
                        var elts = cache.schema[child_defn.ns].element;
                        soap.Client.setAttributeNS(doc, child, "xsi:type",
                            _ns_xsi, elts[child_defn.name].type);
                    }
                    */

                    this.__serialize(doc, child, this.__pl[name], cache, child_defn);
                    cd=parent_defn.children[++i];
                }
            }
        }
    }
});
