import sys
BASE0=""+os.path.dirname(os.path.abspath(__file__))+""
exec(open(BASE0+"/t5_head.py").read())
exec(open(BASE0+"/t5_body.py").read())
