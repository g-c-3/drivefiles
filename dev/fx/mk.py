from PIL import Image, ImageDraw
import docx, pptx, openpyxl
from docx.shared import Pt, Inches
from pptx.util import Inches as PI, Pt as PP
im = Image.new("RGB",(320,200),(30,90,200)); d=ImageDraw.Draw(im); d.ellipse((60,30,260,170),fill=(250,200,40)); d.text((120,90),"FIG 1",fill=(0,0,0)); im.save("fig.png"); im.save("fig.jpg",quality=90)
# docx
D=docx.Document(); D.add_heading("Physics Paper 2019",0); D.add_heading("Section A",1)
p=D.add_paragraph("Answer ALL questions. "); r=p.add_run("Bold part "); r.bold=True; r2=p.add_run("italic part"); r2.italic=True
D.add_paragraph("Q1. State Newton's second law.", style="List Number"); D.add_paragraph("Q2. Define velocity.", style="List Number")
D.add_picture("fig.png", width=Inches(2.5))
t=D.add_table(rows=3, cols=3); t.style="Table Grid"
for i in range(3):
    for j in range(3): t.cell(i,j).text=f"R{i}C{j}"
D.add_paragraph("Unicode: café, π ≈ 3.14, 日本語")
D.save("sample.docx")
# pptx
P=pptx.Presentation(); s=P.slides.add_slide(P.slide_layouts[0]); s.shapes.title.text="Chemistry Review"; s.placeholders[1].text="Term 1 — Unit 3"
s=P.slides.add_slide(P.slide_layouts[1]); s.shapes.title.text="Key points"; tf=s.placeholders[1].text_frame; tf.text="Atoms and molecules"
for t in ["Periodic table","Bonding"]: tf.add_paragraph().text=t
s=P.slides.add_slide(P.slide_layouts[5]); s.shapes.title.text="Diagram"; s.shapes.add_picture("fig.png",PI(1.5),PI(2),width=PI(4))
tb=s.shapes.add_textbox(PI(1),PI(6),PI(6),PI(0.8)); tb.text_frame.text="Caption: the sun over water"
P.save("sample.pptx")
# xlsx
W=openpyxl.Workbook(); ws=W.active; ws.title="Marks"
ws.append(["Name","Maths","Physics","Total"])
for i,(n,a,b) in enumerate([("Asha",88,92),("Ben",75,64),("Chen",91,85)],start=2): ws.append([n,a,b,f"=B{i}+C{i}"])
ws["A1"].font=openpyxl.styles.Font(bold=True); ws.merge_cells("F1:G1"); ws["F1"]="Merged"
ws2=W.create_sheet("Notes"); ws2["A1"]="Café ☕"; ws2["A2"]=3.14159
W.save("sample.xlsx")
