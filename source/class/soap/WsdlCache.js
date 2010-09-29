
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
         _name   : {check: "String"}
        ,_client : {check: "soap.Client"}
        ,_params : {check: "soap.Parameters"}
        ,_simple : {check: "Boolean", init:false}
    }

    ,statics : {
         nsmap: new Object()
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
        ctx.prefix_map = new Object();

        qx.log.Logger.debug("New service: " + ctx.__target_namespace);

        if (qx.core.Variant.isSet("qx.client", "mshtml")) {
            this.definitions = node.childNodes[1];
        }
        else {
            this.definitions = node.childNodes[0];
        }

        var port_type_node = get_elts(node, _ns_wsdl, 'portType')[0];
        var types_node = get_elts(node, _ns_wsdl, 'types')[0];

        this.__decode_methods(port_type_node);
        this.__decode_schemas(types_node);
    }

    ,members: {
         __cache: null
        ,__target_namespace : null
        ,methods : null
        ,messages : null
        ,schema : null
        ,definitions : null

        ,__decode_schemas : function(types_node) {
            var schema_node = null;
            var ctx = this;
            for (var i=0, l=types_node.childNodes.length; i<l; ++i) {
                schema_node = types_node.childNodes[i];
                var schema_tns = schema_node.getAttribute("targetNamespace");
                var schema_key = schema_tns;

                qx.log.Logger.debug("        new namespace: '" + schema_tns + "'");

                var schema = ctx.schema[schema_key];
                if (! schema) {
                    ctx.schema[schema_key] = new Object();

                    schema = ctx.schema[schema_key];
                    schema.simple = new Object();
                    schema.element = new Object();
                    schema.complex = new Object();
                }

                var cn = schema_node.childNodes;
                for (var j=0, k = cn.length; j<k; ++j) {
                    var tn;
                    if (qx.core.Variant.isSet("qx.client", "mshtml")) {
                        tn = cn[j].baseName;
                    }
                    else {
                        tn = cn[j].localName;
                    }

                    var elt = this.__type_from_node(cn[j], schema_tns);
                    if (tn == "element") {
                        schema.element[elt.name] = elt
                    }
                    else if (tn == "import") {

                    }
                    else if (tn == "simpleType") {
                        this.__decode_simple_type(cn[j],elt);
                    }
                    else if (tn == "complexType") {
                        this.__decode_complex_type(cn[j],elt);
                    }
                }
            }
            // fill schema
            if (schema_node == null) {
                ctx.schema = null;
            }
        }
        ,__decode_methods : function(port_type_node) {
            var methods = this.methods;
            var cn = port_type_node.childNodes;
            for (var i=0, l=cn.length; i<l; ++i) {
                var method_name = cn[i].getAttribute("name");
                methods[method_name] = new Object();

                var method = methods[method_name];
                for (var j=0, k=cn[i].childNodes.length; j<k; ++j) {
                    var method_node = cn[i].childNodes[j];

                    var tn
                    if (qx.core.Variant.isSet("qx.client", "mshtml")) {
                        tn = method_node.baseName;
                    }
                    else {
                        tn = method_node.localName;
                    }

                    method.input = new Object();
                    method.input.name = null;
                    method.input.message = null;

                    method.output = new Object();
                    method.output.name = null;
                    method.output.message = null;

                    if (tn == "input" || tn == "output") {
                        method[tn] = new Object();
                        method[tn].name = method_node.getAttribute("name");
                        method[tn].message = method_node.getAttribute("message");
                    }
                }
            }
        }

        ,__decode_sequence : function(node, elt) {
            var first_node = node.firstChild;
            if (! first_node) {
                return;
            }

            var child;
            var min_occurs = first_node.getAttribute("minOccurs");
            var max_occurs = first_node.getAttribute("maxOccurs");
            if (first_node.nextSibling == null && min_occurs != null
                                               && max_occurs != null) { // it's an array
                elt.is_array = true;
                elt.min_occurs = min_occurs;
                elt.max_occurs = max_occurs;

                child = this.__type_from_node(first_node);

                elt.children = new Object();
                elt.children[child.name] = child;
                elt.children[0] = child;
            }
            else {
                var order=0;
                elt.children = new Object();

                for (var n=first_node; n!=null; n=n.nextSibling) {
                    child = this.__type_from_node(n);

                    elt.children[child.name] = child;
                    elt.children[order] = child;

                    ++order;
                }
            }
        }

        ,__decode_complex_type : function(node, elt) {
            var first_node = node.firstChild;
            if (! first_node) {
                return;
            }

            var tn;
            if (qx.core.Variant.isSet("qx.client", "mshtml")) {
                tn = first_node.baseName;
            }
            else {
                tn = first_node.localName;
            }

            if (tn == 'sequence') {
                this.__decode_sequence(first_node, elt);
            }
            if (tn == 'complexContent') {
                this.__decode_complex_content(first_node, elt);
            }

            this.schema[elt.ns].complex[elt.name] = elt
        }

        ,__decode_complex_content : function(node, elt) {
            var first_node = node.firstChild;
            if (! first_node) {
                return;
            }

            var tn;
            if (qx.core.Variant.isSet("qx.client", "mshtml")) {
                tn = first_node.baseName;
            }
            else {
                tn = first_node.localName;
            }

            if (tn == 'extension') {
                var type_qname = first_node.getAttribute("base");
                var type_local = type_qname.split(":")[1];
                var type_ns = this.type_qname_to_ns(node, type_qname);

                elt.base = type_local;
                elt.base_ns = type_ns;

                if (first_node.firstChild) {
                    this.__decode_sequence(first_node.firstChild, elt);
                }
            }
        }

        ,__decode_simple_type : function(node, elt) {
            this.schema[elt.ns].simple[elt.name] = elt

            for (var n = node.firstChild; n; n=n.nextSibling) {
                var nn;
                if (qx.core.Variant.isSet("qx.client", "mshtml")) {
                    nn = n.baseName;
                }
                else {
                    nn = n.localName;
                }

                if (nn == 'restriction') {
                    elt.base = n.getAttribute("base");
                    elt.base_ns = this.type_qname_to_ns(n,elt.base);
                    elt.restrictions = new Object();
                    for (var r = n.firstChild; r != null; r=r.nextSibling) {
                        // TODO: fill restrictions
                    }
                }
            }
        }

        ,__type_from_node: function(node, ns) {
            var elt = new Object();

            elt.type = node.getAttribute("type");
            elt.name = node.getAttribute("name");
            if (ns) {
                elt.ns = ns;
            }

            if (elt.type) {
                elt.ns = this.type_qname_to_ns(node, elt.type);
            }
            else {
                elt.ns = node.parentNode.getAttribute("targetNamespace")
            }

            elt.base = null;

            return elt;
        }

        ,type_qname_to_ns: function(node, type_qname) {
            if (! type_qname) {
                return null;
            }
            var type_defn = type_qname.split(":");
            var retval;

            if (type_defn.length > 0) {
                retval = this.prefix_map[type_defn[0]];

                if (! retval) {
                    var tnode = node;
                    while (! retval) {
                        if (! tnode.parentNode) {
                            return retval;
                        }

                        retval = tnode.getAttribute("xmlns:" + type_defn[0]);
                        tnode = tnode.parentNode;
                    }

                    if (retval) {
                        this.prefix_map[type_defn[0]] = retval;
                        soap.WsdlCache.nsmap[retval] = type_defn[0];
                    }
                }
            }

            return retval;
        }

        ,get_target_namespace: function() {
            return this.__target_namespace;
        }

        ,__get_simple_base : function(child) {
            var retval;
            var type_l = child.type.split(":")[1];
            var simple_type_ns = this.schema[child.ns]

            if (simple_type_ns) {
                var simple_type = simple_type_ns.simple[type_l];

                if (simple_type) {
                    while (simple_type.base != null) {
                        var base_ns = this.schema[simple_type.base_ns]
                        if (base_ns) {
                            var base_l = simple_type.base.split(":")[1];
                            simple_type = base_ns.simple[base_l];

                            qx.core.Assert.assertNotUndefined(simple_type,
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
            }

            return retval;
        }

        ,get_type_defn: function(object_namespace, object_name) {
            var retval;

            var schema = this.schema[object_namespace];
            if (schema) {
                retval = schema.complex[object_name];
            }

            return retval;
        }

        ,has_object: function(object_namespace, object_name) {
            if (this.get_type_defn(object_namespace, object_name)) {
                return true;
            }
            return false;
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

            var type = this.get_type_defn(object_namespace, object_name)
            if (! type) {
                qx.log.Logger.error("object not found: {"+object_namespace + "}"
                                                            + object_name + "");

                return retval;
            }

            var children = type.children;
            var extend = qx.core.Object;
            if (type.base) {
                extend = this.get_class(type.base_ns, type.base);
            }

            retval = {
                extend: extend,
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
