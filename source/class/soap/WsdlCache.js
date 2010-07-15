
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

qx.Class.define("soap.WsdlCache", {extend: qx.core.Object
    ,properties: {
         _client : {check: "soap.Client"}
        ,_params : {check: "soap.Parameters"}
        ,_name : {check: "String"}
        ,_simple : {check: "Boolean", init:false}
    }

    ,construct: function(node) {
        var ctx = this;
        var get_elts = qx.xml.Element.getElementsByTagNameNS;
        var _ns_wsdl = "http://schemas.xmlsoap.org/wsdl/";

        ctx.methods = new Object();
        ctx.messages = new Array();
        ctx.schema = new Object();
        ctx.__target_namespace = node.documentElement.getAttribute(
                                                             "targetNamespace");
        qx.log.Logger.debug("New service: " + ctx.__target_namespace);

        if (qx.core.Variant.isSet("qx.client", "mshtml")) {
            this.definitions = node.childNodes[1];
        }
        else {
            this.definitions = node.childNodes[0];
        }

        var cn = this.definitions.childNodes;

        var i,l,j,k,tn;

        var port_type_node = get_elts(node, _ns_wsdl, 'portType')[0];
        var types_node = get_elts(node, _ns_wsdl, 'types')[0];

        // fill methods
        var methods = ctx.methods;
        cn = port_type_node.childNodes;
        for (i=0, l = cn.length; i<l; ++i) {
            var method_name = cn[i].getAttribute("name");
            methods[method_name] = new Object();

            var method = methods[method_name];
            for (j=0, k=cn[i].childNodes.length; j<k; ++j) {
                var method_node = cn[i].childNodes[j];
                tn = method_node.localName;

                if (tn == "input" || tn == "output") {
                    method[tn] = new Object();
                    method[tn].name = method_node.getAttribute("name");
                    method[tn].message = method_node.getAttribute("message");
                }
            }
        }

        var schema_node = null;
        for (i=0, l=types_node.childNodes.length; i<l; ++i) {
            schema_node = types_node.childNodes[i];
            var schema_tns = schema_node.getAttribute("targetNamespace");
            var schema_key = schema_tns;
            
            var schema = ctx.schema[schema_key];
            if (! schema) {
                ctx.schema[schema_key] = new Object();
                schema = ctx.schema[schema_key];
                schema.simple = new Object();
                schema.element = new Object();
                schema.complex = new Object();
            }
    
            cn = schema_node.childNodes;
            for (j=0, k = cn.length; j<k; ++j) {
                tn = cn[j].tagName;

                var elt = this.__type_from_node(cn[j]);
                elt.ns = schema_tns;
                if (tn == "xs:element") {
                    //schema.element[elt.name] = elt
                }
                else if (tn == "xs:import") {

                }
                else if (tn == "xs:simpleType") {
                    schema.simple[elt.name] = elt

                    for (var n = cn[j].firstChild; n != null; n=n.nextSibling) {
                        if (n.nodeName == 'xs:restriction') {
                            elt.base = n.getAttribute("base");
                            elt.base_ns = soap.Client.type_qname_to_ns(n,elt.base);
                            elt.restrictions = new Object();
                            for (var r = n.firstChild; r != null; r=r.nextSibling) {
                                // TODO: fill restrictions
                            }
                        }
                    }
                }
                else if (tn == "xs:complexType") {
                    elt.children = new Object();
                    var first_node = cn[j].childNodes[0];
                    var child;

                    if (first_node.hasChildNodes()) {
                        first_node = first_node.childNodes[0];

                        var min_occurs = first_node.getAttribute("minOccurs");
                        var max_occurs = first_node.getAttribute("maxOccurs");
                        if (first_node.nextSibling == null && min_occurs != null
                                                           && max_occurs != null) { // it's an array
                            elt.is_array = true;
                            elt.min_occurs = min_occurs;
                            elt.max_occurs = max_occurs;

                            child = this.__type_from_node(first_node);

                            elt.children[child.name] = child;
                        }
                        else {
                            var order=0;
                            for (var n=first_node; n!=null; n=n.nextSibling) {
                                child = this.__type_from_node(n);

                                elt.children[child.name] = child;
                                elt.children[order] = child;

                                ++order;
                            }
                        }
                    }

                    schema.complex[elt.name] = elt
                }
            }
        }
        // fill schema
        if (schema_node == null) {
            ctx.schema = null;
        }
    }

    ,members: {
         __cache: null
        ,__target_namespace : null
        ,methods : null
        ,messages : null
        ,schema : null
        ,definitions : null

        ,__type_from_node: function(node) {
            var elt = new Object();
            
            elt.type = node.getAttribute("type");
            elt.name = node.getAttribute("name");
            if (elt.type) {
                elt.ns = soap.Client.type_qname_to_ns(node, elt.type);
            }
            else {
                elt.ns = node.parentNode.getAttribute("targetNamespace")
            }

            elt.base = null;

            return elt;
        }

        ,get_target_namespace: function() {
            return this.__target_namespace;
        }

        ,__get_simple_base : function(child) {
            var retval;
            var type_l = child.type.split(":")[1];
            var simple_type = this.schema[child.ns].simple[type_l];

            if (simple_type) {
                while (simple_type.base != null) {
                    var base_ns = this.schema[simple_type.base_ns]
                    if (base_ns) {
                        var base_l = simple_type.base.split(":")[1];
                        simple_type = base_ns.simple[base_l];

                        qx.core.Assert.assertNotUndefined(
                            simple_type,
                            "Simple Type " +
                            "'{" + simple_type.base_ns + "}'" +
                            " '" + simple_type.base + "' " +
                            "does not exist");
                    }
                    else {
                        base_ns = null;
                        break;
                    }
                }

                if (base_ns) {
                    retval = simple_type.type.split(":")[1];
                }
                else {
                    retval = simple_type.base.split(":")[1];
                }

                retval = soap.Client.TYPE_MAP[retval];
            }

            return retval;
        }

        ,get_class_map: function(object_namespace, object_name) {
            var ctx=this;
            var retval;

            if (! object_namespace) {
                object_namespace = ctx.__target_namespace;
            }

            if (! object_name) {
                throw new Error("object_name must be defined!");
            }

            qx.log.Logger.debug("creating object: {" + object_namespace + "}"
                                                            + object_name + "");

            var schema = ctx.schema[object_namespace];
            if (! schema) {
                qx.log.Logger.debug("'" + object_namespace + "' not found!");
                return undefined;
            }

            var type = schema.complex[object_name];
            if (! type) {
                qx.log.Logger.debug("'" + object_name + "' not found!");
            }
            else {
                var children = type.children;
                retval = {
                    extend: qx.core.Object,
                    properties: {},
                    statics: {
                        TYPE_DEFINITION: type
                    }
                };

                // get the props
                var props = retval.properties;
                for (var k in children) {
                    var child = children[k];
                    var prop_name = "_" + child.name;
                    if ( (! (prop_name in props))
                                    && children.hasOwnProperty(k)
                                    && isNaN(k) ) {

                        var type_l = child.type.split(":")[1];

                        var prop_type;
                        if (child.is_array) {
                            prop_type = "Array";
                        }
                        else {
                            prop_type = soap.Client.TYPE_MAP[type_l];
                        }

                        if (! prop_type) {
                            prop_type = this.__get_simple_base(child);
                        }

                        if (! prop_type) {
                            prop_type = "Object";
                        }

                        var prop_def = {"check": prop_type, init: null,
                                                                 nullable: true}
                        props[prop_name] = prop_def;
                    }
                }
            }

            return retval;
        }

        ,get_class: function(object_namespace, object_name) {
            var ctx=this;
            
            if (! object_name) {
                throw new Error("object_name must be defined!");
            }

            var class_name = object_namespace + "." + object_name;
            var clazz = qx.Class.getByName(class_name);

            if (! clazz) {
                var class_map = this.get_class_map(object_namespace, object_name);
                if (class_map) {
                    clazz = qx.Class.define(class_name, class_map);
                }
            }

            return clazz;
        }
        
        ,get_object: function(object_namespace, object_name) {
            var clazz = this.get_class(object_namespace, object_name);
            var retval;

            if (clazz) {
                retval = new clazz();
            }

            return retval;
        }

        ,get_table: function(method_name) {
            // methodun dondurdugu veri tipini alır.
            var method_input = this.schema.complex[method_name];
            if (! method_input) {
                throw new Error("Method named '" + method_name +
                                                  "' is not exposed via wsdl.");
            }

            var class_map = {extend: arskom.ui.Table};
        }

        ,get_form: function(object_namespace, object_name) {
            var class_map = this.get_class_map(object_namespace, object_name);
            var props = class_map.properties;
            var form = new qx.ui.form.Form();
            var pd = this.self(arguments).PRIMITIVE_DEFAULTS;

            for (var key in props) {
                if (props.hasOwnProperty(key)) {
                    var name = key.slice(1);
                    var type = props[key].check;

                    if (type in pd) {
                        var wgt = new pd[type]();
                        form.add(wgt, name);
                    }
                }
            }

            return form;
        }

        ,get_form_widget: function(object_namespace, object_name) {
            var form = this.get_form(object_namespace, object_name);
            var retval = new qx.ui.form.renderer.Single(form);
            return retval;
        }
    }
});
