import os,sys
from PIL import Image
from reportlab.pdfgen import canvas
n=int(sys.argv[1]); side=int(sys.argv[2]); out=sys.argv[3]
c=canvas.Canvas(out,pagesize=(400,400))
for i in range(n):
    im=Image.frombytes("RGB",(side,side),os.urandom(side*side*3))
    c.drawInlineImage(im,0,0,400,400,preserveAspectRatio=False) if False else c.drawImage(__import__("reportlab.lib.utils",fromlist=["ImageReader"]).ImageReader(im),0,0,400,400)
    c.setFont("Helvetica",20); c.drawString(20,20,"Page %d"%(i+1))
    c.showPage()
c.save(); print(out,os.path.getsize(out))
