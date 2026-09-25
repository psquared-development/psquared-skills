import numpy as np, wave
SR=44100; DUR=22.0; SLOW=22/15; BEAT=(60/128)*SLOW; T0=0.02*SLOW
N=int(SR*DUR); L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(7)
def b(k): return T0+k*BEAT
def add(sig,t,gain=1.0,pan=0.0):
    i=int(t*SR); 
    if i>=N: return
    s=sig[:N-i]*gain; L[i:i+len(s)]+=s*(1-max(0,pan)); R[i:i+len(s)]+=s*(1+min(0,pan))
def env(n,a,d): 
    e=np.ones(n); na=max(1,int(a*SR)); e[:na]=np.linspace(0,1,na); e*=np.exp(-np.arange(n)/SR/d) if d else 1; return e
def kick(big=False):
    n=int(SR*(0.55 if big else 0.4)); t=np.arange(n)/SR
    f=45+110*np.exp(-t*28); ph=2*np.pi*np.cumsum(f)/SR
    k=np.sin(ph)*np.exp(-t*(5 if big else 7)); k+=0.25*np.exp(-t*120)*rng.standard_normal(n)*0.3
    return np.tanh(k*1.6)
def hat(open_=False):
    n=int(SR*(0.25 if open_ else 0.05)); x=rng.standard_normal(n); x=np.diff(np.concatenate([[0],x]))  # highpass
    return x*np.exp(-np.arange(n)/SR/(0.08 if open_ else 0.012))*0.35
def clap():
    n=int(SR*0.3); x=rng.standard_normal(n); x=np.diff(np.concatenate([[0],x]))
    e=np.zeros(n)
    for o in (0,0.01,0.02): i=int(o*SR); e[i:]+=np.exp(-np.arange(n-i)/SR/0.06)
    return x*e*0.35
def note(freq,dur,kind='pluck',vel=1.0):
    n=int(SR*dur); t=np.arange(n)/SR
    if kind=='pluck':
        s=(np.sign(np.sin(2*np.pi*freq*t))*0.35+np.sin(2*np.pi*freq*t)*0.65)*np.exp(-t*9)
        s=np.convolve(s,np.ones(6)/6,'same')
    elif kind=='bass':
        s=np.sin(2*np.pi*freq*t)+0.25*np.sin(4*np.pi*freq*t); s*=np.minimum(1,t*80)*np.exp(-t*2.2)
    elif kind=='pad':
        s=sum(np.sin(2*np.pi*freq*(1+d)*t) for d in (-0.004,0,0.004))/3; s*=np.minimum(1,t*3)*np.minimum(1,(dur-t)*3)
    return s*vel
def mtof(m): return 440*2**((m-69)/12)
chords=[(48,[60,64,67,72]),(43,[59,62,67,71]),(45,[57,60,64,69]),(41,[57,60,65,69])]  # C G Am F
def chord_at(k): return chords[int(k//4)%4]
def riser(t0,t1,gain=0.5):
    n=int((t1-t0)*SR); x=rng.standard_normal(n); a=np.linspace(0.02,0.35,n); y=np.zeros(n); acc=0
    for i in range(n): acc+= a[i]*(x[i]-acc); y[i]=acc
    y*=np.linspace(0,1,n)**2; add(y*gain,t0)
def rev_cym(t_end,length=0.65,gain=0.6):
    n=int(length*SR); x=rng.standard_normal(n); x=np.diff(np.concatenate([[0],x])); x*=np.linspace(0,1,n)**3; add(x*gain,t_end-length)
def crash(t,gain=0.5):
    n=int(SR*1.6); x=rng.standard_normal(n); x=np.diff(np.concatenate([[0],x])); add(x*np.exp(-np.arange(n)/SR/0.5)*gain,t)
# --- Build (beats 0-4)
riser(0.0,b(4),0.55)
for k in np.arange(0,4,0.25):
    if k>=1 or k%0.5==0: add(hat(),b(k),0.5+0.5*k/4,pan=0.2)
for k in np.arange(3,4,0.125): add(clap(),b(k),0.25+0.6*(k-3))
for k in (0,2): c=chord_at(0); [add(note(mtof(m),BEAT*2,'pad',0.08),b(k)) for m in c[1]]
# --- Grooves
def groove(k0,k1,full=False):
    for k in range(k0,k1):
        add(kick(big=(k==k0)),b(k),0.95)
        if k%2==1: add(clap(),b(k),0.8)
        for s in range(4):
            add(hat(open_=(s==2)),b(k+s/4),0.35 if s%2 else 0.22,pan=0.3)
        root,notes=chord_at(k)
        # bass: root on beat, octave on the "and"
        add(note(mtof(root-12),BEAT*0.45,'bass',0.55),b(k)); add(note(mtof(root),BEAT*0.3,'bass',0.35),b(k+0.5))
        # pluck arp 16ths
        for s in range(4):
            m=notes[(k*4+s)%4]+12*(s==3)
            add(note(mtof(m),BEAT*0.5,'pluck',0.16 if not full else 0.2),b(k+s/4),pan=(-0.35 if s%2 else 0.35))
        if full:
            if k%4==0: [add(note(mtof(m),BEAT*4,'pad',0.07),b(k)) for m in notes]
            add(hat(),b(k+0.125),0.12,pan=-0.5); add(hat(),b(k+0.625),0.12,pan=-0.5)
groove(4,15)
# --- Break (beat 15): stop, sub hit, reverse swell into 16
add(note(mtof(36),0.35,'bass',0.35),b(15)); rev_cym(b(16),BEAT*0.8,0.3)
# --- Drop B (beats 16-28) + impact
crash(b(16),0.45); groove(16,28,full=True)
# --- Outro (beats 28-): final hit + resolving chord
add(kick(True),b(28),1.0); crash(b(28),0.4)
for m in [48,60,64,67,72,76]: add(note(mtof(m),DUR-b(28),'pad',0.09 if m>=60 else 0.25),b(28))
for k in np.arange(28,31,0.5): add(note(mtof([72,76,79,84][int((k-28)*2)%4]),BEAT,'pluck',0.12*(1-(k-28)/3)),b(k),pan=0.3)
# fade out
fade=np.ones(N); fs=int((DUR-1.2)*SR); fade[fs:]=np.linspace(1,0,N-fs)**1.5; fade[:int(0.03*SR)]=np.linspace(0,1,int(0.03*SR))
L*=fade; R*=fade
# master: soft clip + normalize
st=np.stack([L,R],1); st=np.tanh(st*1.2); st/=np.max(np.abs(st))*1.12
w=wave.open('own_music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes()); w.close()
print('written', DUR, 's, beat', round(BEAT,4))
