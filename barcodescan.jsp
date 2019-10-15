<%-- 
    Document   : barcodescan
    Created on : Nov 19, 2017, 11:39:31 AM
    Author     : oudsoft
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@ taglib prefix="sql" uri="http://java.sun.com/jsp/jstl/sql"%>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions"%>
<%@ page language="java" %>
<%@ page isELIgnored = "false"%>

<jsp:directive.include file="/resource/db/resourceDB.jsp"/>


<c:choose>
    <c:when test="${(!empty sessionScope.username)}">
        <!DOCTYPE html>
        <html>
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <title>ระบบขายของออนไลน์</title>
                <meta name = "viewport" content = "width = device-width, initial-scale = 1"/>
                <link rel="shortcut icon" type="image/x-icon" href="resource/img/ico/favicon4.ico"/>
                <!-- jQuery Declaire -->
                <script src="resource/js/jquery-ui-1.12.1.custom/external/jquery/jquery.js" type="text/javascript"></script>
                <script src="resource/js/jquery-ui-1.12.1.custom/jquery-ui.js" type="text/javascript"></script>
                <link rel="stylesheet" type="text/css" href="resource/js/jquery-ui-1.12.1.custom/jquery-ui.css"/>     
                <link rel="stylesheet" type="text/css" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css"/>
                <!-- webcodecamjquery Declaire -->
                <script type="text/javascript" src=" resource/js/barcode/js/qrcodelib.js"></script>
                <script type="text/javascript" src="resource/js/barcode/js/webcodecamjquery.js"></script>        
                <script type="text/javascript" src="resource/js/barcode/js/filereader.js"></script> 
                <script type="text/javascript">
                    $.ajaxPrefilter(function(options, original_Options, jqXHR) {
                        options.async = true;
                    });
                </script>                  
                <style type="text/css">
                    .scanner-laser{
                        position: absolute;
                        margin: 20px;
                        height: 30px;
                        width: 30px;
                    }
                    .laser-leftTop{
                        top: 0;
                        left: 0;
                        border-top: solid red 5px;
                        border-left: solid red 5px;
                    }
                    .laser-leftBottom{
                        bottom: 0;
                        left: 0;
                        border-bottom: solid red 5px;
                        border-left: solid red 5px;
                    }
                    .laser-rightTop{
                        top: 0;
                        right: 0;
                        border-top: solid red 5px;
                        border-right: solid red 5px;
                    }
                    .laser-rightBottom{
                        bottom: 0;
                        right: 0;
                        border-bottom: solid red 5px;
                        border-right: solid red 5px;
                    }
                    .scanbarcode {
                        width: 100%;
                        text-align: center;
                    }
                </style>             
            </head>

            <body>
                <h3 style="text-align: center; font-size: 18px; font-weight: bold;">สแกนบาร์โค้ดสินค้า</h3>
                <hr/>
                <div style="text-align: center">
                    <img width="320" height="240" id="scanned-img" src="" alt="ภาพบาร์โค้ดจากกล้องหรือจากไฟล์ที่อัพโหลด"/>
                </div>
                <p id="scanned-QR" style="text-align: center; font-size: 18px; font-weight: bold; text-shadow: 1px 1px #949494;">คลิกปุ่ม <b>Play</b> เพื่อเปิดสัญญาณภาพจากกล้อง</p>
                <hr/>
                <div style="text-align: center">
                    <div class="well" style="position: relative;display: inline-block;">
                        <canvas id="webcodecam-canvas" width="320" height="240"></canvas>
                        <div class="scanner-laser laser-rightBottom" style="opacity: 0.5;"></div>
                        <div class="scanner-laser laser-rightTop" style="opacity: 0.5;"></div>
                        <div class="scanner-laser laser-leftBottom" style="opacity: 0.5;"></div>
                        <div class="scanner-laser laser-leftTop" style="opacity: 0.5;"></div>       
                    </div>
                </div>
                <hr/>
                <div id="video-control-panel" style="border: #000; border-width: 3px;">
                    <b>กล้อง : </b><select id="camera-select" class="form-control" style="display: inline-block;width: auto;">&nbsp;</select>
                    <input type="button" id="play-cmd" value=" Play "/>
                    <input type="button" id="grab-cmd" value=" Image Shot " class="disabled"/>
                    <input type="button" id="stop-cmd" value=" Stop "/>
                    <input type="button" id="decode-img" value="Upload Barcode Picture"/> 
                    <input type="text" id="image-url" placeholder="Image url" readonly="true"/>
                    <br/>
                    <b>Zoom :  </b><input id="zoom" onchange="changeZoom();" type="range" min="10" max="30"/>
                    <br/>
                    <b>Brightness : </b><input id="brightness" onchange="changeBrightness();" type="range" min="0" max="128" value="0"/>
                    <br/>                    
                    <b>Sharpness : </b><input id="sharpness" onchange="changeSharpness();" type="checkbox"/>
                    <br/>
                    <b>Grayscale : </b><input id="grayscale" onchange="changeGrayscale();" type="checkbox"/>
                </div>
                <br/><br/>
                <hr/>
                <div id="userhelp" style="border: solid #00ff00 4px; margin-left: 10px; margin-top: 10px; padding-left: 10px;"> 
                    <p style="text-align: center; font-size: 18px; font-weight: bold; text-shadow: 1px 1px #949494;">วิธีสแกนบาร์โค้ด</p> 
                    <p>
                        หากมีกล้องมากกว่าหนึ่งกล้อง สามารถคลิกเลือกกล้องได้จากช่องเลื่อก <b>กล้อง</b> <br/>
                        คลิกปุ่ม <b>Play</b> เพื่อเปิดสัญญาณภาพจากกล้อง <br/>
                        คลิกปุ่ม <b>Image Shot</b> เพื่อจับภาพจากกล้อง <br/>
                        คลิกปุ่ม <b>Stop</b> เพื่อปิดสัญญาณภาพของกล้อง <br/>
                        คลิกปุ่ม <b>Upload Barcode Picture</b> เพื่ออัพโหลดรูปบาร์โค้ดในเครื่องขึ้นไปสแกน <br/>
                        ปรับระยะ Zoom เข้า-ออก จากไสไลด์บาร์ <br/>
                        ปรับความมืด-สว่าง จากไสไลด์บาร์ <br/>
                        เลือกความคมของภาพ จากเช็คบ็อก <br/>
                        เลือกเป็นภาพสีหรือขาว-ดำ จากเช็คบ็อก <br/>
                        หากเสียง บีป ไม่ดัง ให้คลิกปุ่ม <b>ทดสอบเสียง</b> <br/>
                        คลิกปุ่ม <b>กลับ</b> หากต้องการกลับหน้าบิลที่เปิดอยู่ <br/>
                    </p>
                    <%-- <input type="button" id="close-helpuser-cmd" value=" ปิด "/> --%>
                </div>
                <div>&nbsp;</div>
                <div style="text-align: center">
                    <%-- <input type="button" id="open-helpuser-cmd" value="วิธีสแกนบารโค้ด"/>         --%>

                    <input type="button" id="soundtest-cmd" value="ทดสอบเสียง"/>

                    <input type="button" id="back-cmd" value="  กลับ  "/>
                </div>

                <div id="sound-control-panel">
                    <audio id="audiotag1" src="resource/js/barcode/audio/beep.mp3" preload="auto"></audio>
                    <input type="hidden" id="productid" name="productid" value="${param.productid}"/>                    
                    <input type="hidden" id="producttypeid" name="producttypeid" value="${param.producttypeid}"/>
                </div>

                <div data-role="popup" id="product-bc-4sale-dg" style="width: 800px">
                    &nbsp;
                </div>
                <div id="blankdiv">&nbsp;</div>

                <script>
                    var scannerLaser = $(".scanner-laser");
                    var scannedImg = $("#scanned-img");
                    var scannedQR = $("#scanned-QR");
                    var imageUrl = $("#image-url");
                    var grabImg = $("#grab-img");
                    var zoom = $("#zoom");
                    var contrast = $("#contrast");
                    var brightness = $("#brightness");
                    var sharpness = $("#sharpness");
                    var grayscale = $("#grayscale");

                    var args = {
                        autoBrightnessValue: 100,
                        resultFunction: function(res) {
                            [].forEach.call(scannerLaser, function(el) {
                                $(el).fadeOut(300, function() {
                                    $(el).fadeIn(300);
                                });
                            });
                            mybeep();
                            scannedImg.attr("src", res.imgData);
                            scannedQR.text(res.format + ": " + res.code);
                            if (confirm('รหัสบาร์โค้ดที่อ่านได้คือ\n' + res.code + '\nคุณต้องการอัพเดทรหัสบาร์โค้ดด้วยค่านี้หรือไม่?') === true) {
                                updatebardode(res.code);
                            }
                        },
                        getDevicesError: function(error) {
                            var p, message = "Error detected with the following parameters:\n";
                            for (p in error) {
                                message += (p + ": " + error[p] + "\n");
                            }
                            console.log(message);
                        },
                        getUserMediaError: function(error) {
                            var p, message = "Error detected with the following parameters:\n";
                            for (p in error) {
                                message += (p + ": " + error[p] + "\n");
                            }
                            console.log(message);
                        },
                        cameraError: function(error) {
                            var p, message = "Error detected with the following parameters:\n";
                            if (error.name === "NotSupportedError") {
                                var ans = confirm("Your browser does not support getUserMedia via HTTP!\n(see: https://goo.gl/Y0ZkNV).\n You want to see github demo page in a new window?");
                                if (ans) {
                                    window.open("https://www.myshopman.com/mshop/resource/barcode/simplejquery.jsp");
                                }
                            } else {
                                for (p in error) {
                                    message += p + ": " + error[p] + "\n";
                                }
                                console.log(message);
                            }
                        },
                        cameraSuccess: function() {
                            grabImg.removeClass("disabled");
                        }
                    };

                    function fadeOut(el, v) {
                        el.style.opacity = 1;
                        (function fade() {
                            if ((el.style.opacity -= 0.1) < v) {
                                el.style.display = "none";
                                el.classList.add("is-hidden");
                            } else {
                                requestAnimationFrame(fade);
                            }
                        })();
                    }

                    function fadeIn(el, v, display) {
                        if (el.classList.contains("is-hidden")) {
                            el.classList.remove("is-hidden");
                        }
                        el.style.opacity = 0;
                        el.style.display = display || "block";
                        (function fade() {
                            var val = parseFloat(el.style.opacity);
                            if (!((val += 0.1) > v)) {
                                el.style.opacity = val;
                                requestAnimationFrame(fade);
                            }
                        })();
                    }

                    changeZoom = function(a) {
                        if (decoder.isInitialized()) {
                            var value = typeof a !== "undefined" ? parseFloat(a.toPrecision(2)) : zoom.val() / 10;
                            decoder.options.zoom = value;
                        }
                    };

                    changeContrast = function() {
                        if (decoder.isInitialized()) {
                            var value = contrast.val();
                            decoder.options.contrast = parseFloat(value);
                        }
                    };

                    changeBrightness = function() {
                        if (decoder.isInitialized()) {
                            var value = brightness.val();
                            decoder.options.brightness = parseFloat(value);
                        }
                    };

                    changeSharpness = function() {
                        if (decoder.isInitialized()) {
                            var value = sharpness.prop("checked");
                            if (value) {
                                decoder.options.sharpness = [0, -1, 0, -1, 5, -1, 0, -1, 0];
                            } else {
                                decoder.options.sharpness = [];
                            }
                        }
                    };

                    changeGrayscale = function() {
                        if (decoder.isInitialized()) {
                            var value = grayscale.prop("checked");
                            if (value) {
                                decoder.options.grayScale = true;
                            } else {
                                decoder.options.grayScale = false;
                            }
                        }
                    };

                    var decoder = $("#webcodecam-canvas").WebCodeCamJQuery(args).data().plugin_WebCodeCamJQuery;


                    decoder.init();

                    var cameraSelect = $("#camera-select");
                    decoder.buildSelectMenu(cameraSelect, 'user|front').init(args);

                    $(document).on("click", "#play-cmd", function() {
                        scannedQR.text("Scanning ...");
                        grabImg.removeClass("disabled");
                        decoder.play();
                    });

                    $(document).on("click", "#grab-cmd", function() {
                        scannedImg.attr("src", decoder.getLastImageSrc());
                    });

                    $(document).on("click", "#stop-cmd", function() {
                        grabImg.addClass("disabled");
                        scannedQR.text("Stopped");
                        decoder.stop();
                    });

                    $(document).on("click", "#decode-img", function() {
                        if (decoder.isInitialized()) {
                            decoder.decodeLocalImage(imageUrl.val());
                        }
                        imageUrl.val(null);
                    });

                    $("#camera-select").on("change", function() {
                        if (decoder.isInitialized()) {
                            decoder.stop();
                            //decoder.play();
                        }
                    });

                    $(document).on("click", "#soundtest-cmd", function() {
                        mybeep();
                    });

                    function mybeep() {
                        $('#audiotag1')[0].play();
                    }

                    $(document).on("click", "#back-cmd", function() {
                        back2productmng();
                    });

                    $(document).on("click", "#open-helpuser-cmd", function() {
                        $("#userhelp").popup('open');
                    });

                    $(document).on("click", "#close-helpuser-cmd", function() {
                        $("#userhelp").popup('close');
                    });

                    function updatebardode(bc) {
                        var pid = $("#productid").val();
                        $.post("${pageContext.request.contextPath}/commoncgi/do_updatebarcode.jsp", {pid: pid, bc: bc},
                        function(data) {
                            $("#blankdiv").html(data);
                            var $response = $(data);
                            var theresult = $response.filter('#result').text();
                            if (theresult === '1') {
                                decoder.stop();
                                back2productmng();
                            }
                        });
                    }

                    function back2productmng() {
                        var productid = $("#productid").val();
                        var producttypeid = $("#producttypeid").val();
                        window.location = "${pageContext.request.contextPath}/productmng.jsp?updateid=" + productid + "&ptypeid=" + producttypeid;
                    }


                    $(function() {
                        $("#userhelp").accordion({
                            collapsible: true,
                            active: false
                        });
                    });

                </script>    
            </body>            
        </html>
    </c:when>
    <c:otherwise>
        <!DOCTYPE html>
        <html>
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <title>ระบบขายของออนไลน์</title>
                <meta name = "viewport" content = "width = device-width, initial-scale = 1"/>
                <link rel="shortcut icon" type="image/x-icon" href="resource/img/ico/favicon4.ico"/>
                <script src = "https://code.jquery.com/jquery-1.11.3.min.js"></script> 
                <script>
                    $(document).on("click", "#back-cmd", function() {
                        back2home();
                    });
                    function back2home() {
                        window.location = "../index.jsp";
                    }
                </script>   
            </head>
            <body>
                <h3 style="text-align: center; font-size: 18px; font-weight: bold; text-shadow: 1px 1px #949494;">เกิดความผิดพลาด</h3>
                <div align="center"><input type="button" id="back-cmd" value=" กลับ "/></div>
            </body>
        </html>
    </c:otherwise>
</c:choose>                    