
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
        this.__pl=new Object();
    }

    ,members : {
        __pl : null

        ,__decode_array : function(doc, parent, value, cache) {
            for (var i=0, l=value.length; i<l; ++i) {
                var p_ns = parent.parentNode.namespaceURI;
                var p_ln;
                
                if (qx.core.Variant.isSet("qx.client", "mshtml")) {
                    p_ln = parent.parentNode.baseName;
                }
                else {
                    p_ln = parent.parentNode.localName;
                }

                var type_name = cache.schema[p_ns].complex[p_ln].children[0].type
                var type_ns = cache.type_qname_to_ns(parent, type_name);
                var type_local = type_name.split(":")[1];
                var type_defn = cache.schema[type_ns].complex[type_local];
                var child_name = type_defn.children[0].name;

                var child = soap.Client.createSubElementNS(
                          doc,parent,child_name,parent.namespaceURI);

                this.__serialize(doc, child, value[i], cache);
            }
        }

        ,__serialize : function(doc, parent, value, cache) {
            var t = typeof(value);
            var child;
            var _ns_xsd = "http://www.w3.org/2001/XMLSchema"
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

                    var milliseconds = value.getMilliseconds().toString();
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
                            + milliseconds + timezone;

                    parent.appendChild(doc.createTextNode(value));
                }
                else if (value instanceof Number) {
                    parent.appendChild(doc.createTextNode(value.toString()));
                }
                // Array
                else if(value instanceof Array) {
                    for(var name in value) {
                        if (value.hasOwnProperty(name)) {
                            if(!isNaN(name)) { // contiguous array
                                this.__decode_array(doc, parent, value, cache);
                                break;
                            }
                            else { // associative array
                                child = soap.Client.createSubElementNS(doc,
                                             parent, name, parent.namespaceURI);
                                this.__serialize(doc, child, value[name], cache);
                            }
                        }
                    }
                }
                else if (qx.xml.Document.isXmlDocument(value)) {
                    parent.appendChild(value);
                }
                else { // Object or custom function
                    var props = qx.util.PropertyUtil.getProperties(
                                                             value.constructor);
                    for(var k in props) {
                        if (props.hasOwnProperty(k)) {
                            var getter = "get" + k;
                            var data = value[getter]();

                            var ns = eval(value.classname).TYPE_DEFINITION.ns;

                            var key = k.slice(1);
                            child = soap.Client.createSubElementNS(doc,
                                                               parent, key, ns);
                            this.__serialize(doc, child, data, cache);
                        }
                    }
                }
            }
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

        ,to_xml : function(doc, parent, cache) {
            for(var name in this.__pl) {
                if (this.__pl.hasOwnProperty(name)) {
                    var child = soap.Client.createSubElementNS(doc, parent,
                                            name, cache.get_target_namespace());
                    this.__serialize(doc, child, this.__pl[name], cache);
                }
            }
        }
    }
});
