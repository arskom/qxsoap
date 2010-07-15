
/*
 * Copyright (c) 2008-2009, Burak Arslan (burak.arslan-qx@arskom.com.tr).
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
 * THIS SOFTWARE IS PROVIDED BY Burak Arslan ''AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL Burak Arslan BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

qx.Class.define("soap.demo.scr.basic.Simple", { extend : qx.core.Object
    ,properties : {
        widget : { check : "Object" }
    }
    ,construct : function () {
        this.base(arguments);
        var cnt = new qx.ui.container.Composite(new qx.ui.layout.HBox());
        this.setWidget(cnt);

        var gbLogin = new qx.ui.groupbox.GroupBox("Demo");
        gbLogin.setLayout(new qx.ui.layout.Grid());
        cnt.add(gbLogin);

        gbLogin.add(new qx.ui.basic.Label("Name:"), {column: 0, row: 0});
        gbLogin.add(new qx.ui.basic.Label("Times:"), {column: 0, row: 1});

        var txtName = new qx.ui.form.TextField("Qooxdoo Skywalker");
        var txtTimes = new qx.ui.form.TextField("5");
        gbLogin.add(txtName, {column: 1, row: 0});
        gbLogin.add(txtTimes, {column: 1, row: 1});

        var btnSubmitHello = new qx.ui.form.Button("Hello 1");
        gbLogin.add(btnSubmitHello,{column: 0, row: 2});

        var btnSubmitName = new qx.ui.form.Button("Name 1");
        gbLogin.add(btnSubmitName,{column: 0, row: 3});

        btnSubmitName.addListener("execute", function(e) {
            var params = new soap.Parameters();

            var self = this;
            self.SoapRunning = soap.demo.Application.cliSvc.callAsync( "name", params, function(r) {
                self.SoapRunning = null;
                if (r instanceof Error) {
                    alert("An error has occured!\r\n\r\n" + r.fileName + " line " + r.lineNumber);
                }
                else {
                    alert(r);
                }
            });
        });

        btnSubmitHello.addListener("execute", function(e) {
            var params = new soap.Parameters();
            params.add("name", txtName.getValue());
            params.add("times", txtTimes.getValue());

            var ctx = this;
            soap.demo.Application.cliSvc.easy("say_hello", txtName.getValue(), txtTimes.getValue(), function(r) {
                if (r instanceof Error) {
                    alert("An error has occured!\r\n\r\n" + r.fileName + " line " + r.lineNumber);
                }
                else {
                    var i;
                    var retval="";
                    for (i=0;i<r.length;i++){
                        retval += i + " : " + r[i] + "\r\n";
                    }
                    alert(retval);
                }
            });
        });
    }
});