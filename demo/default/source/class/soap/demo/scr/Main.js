
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

qx.Class.define("soap.demo.scr.Main", { extend : qx.core.Object
    ,properties : {
        widget : { check : "Object" }
    }
    ,construct : function() {
        self=this;

        var lvMain = new qx.ui.container.Composite(new qx.ui.layout.VBox());
        this.setWidget(lvMain);

        var toolBar = new qx.ui.toolbar.ToolBar();
        lvMain.add(toolBar);

        var lhToolbar = new qx.ui.container.Composite(new qx.ui.layout.HBox());
        toolBar.add(lhToolbar);

        var lbl = new qx.ui.basic.Label("<b>SOAP Demo</b>");
        lbl.setRich(true);
        lhToolbar.add(lbl,{flex:1});

        var lbBottom = new qx.ui.container.Composite(new qx.ui.layout.HBox());
        lvMain.add(lbBottom,{flex:1});

        var btnSimple = new qx.ui.toolbar.Button("Simple");
        btnSimple.addListener("execute", function(e) {
            lbBottom.removeAll();
            var w = new soap.demo.scr.basic.Simple();
            lbBottom.add(w.getWidget());
        }, this);
        lhToolbar.add(btnSimple);

        var btnTable = new qx.ui.toolbar.Button("Table");
        btnTable.addListener("execute", function(e) {
            lbBottom.removeAll();
            var w = new soap.demo.scr.basic.Table();
            lbBottom.add(w.getWidget());
        }, this);
        lhToolbar.add(btnTable);
    }
});
