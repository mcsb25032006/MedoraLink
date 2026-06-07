from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import json
import os
import copy
from datetime import datetime, date
import typing as _typing

# Optional: Google Generative AI (Gemini)
# Load .env if present
try:
    from dotenv import load_dotenv  # type: ignore
    # Attempt to load backend/.env relative to this file first, then default
    _env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(_env_path):
        load_dotenv(_env_path)
    else:
        load_dotenv()
except Exception:
    pass

def _get_gemini_config():
    # Reload .env dynamically to support runtime key updates without restarting server
    try:
        from dotenv import load_dotenv  # type: ignore
        _env_path = os.path.join(os.path.dirname(__file__), '.env')
        if os.path.exists(_env_path):
            load_dotenv(_env_path, override=True)
    except Exception:
        pass
    return os.getenv('GEMINI_API_KEY'), os.getenv('GEMINI_MODEL', 'gemini-2.5-pro')

def _collapse_messages_for_llm(messages: _typing.List[dict]) -> str:
    """Flatten chat messages into a single prompt string for basic LLMs.

    Expected message shape: { role: 'system'|'user'|'assistant', content: str }
    """
    if not isinstance(messages, list):
        return "User: Hello!\nAssistant:"
    lines: _typing.List[str] = []
    for m in messages:
        role = str(m.get('role', 'user')).lower()
        content = str(m.get('content', '')).strip()
        if not content:
            continue
        if role == 'system':
            lines.append(f"[System]\n{content}\n")
        elif role == 'assistant':
            lines.append(f"Assistant:\n{content}\n")
        else:
            lines.append(f"User:\n{content}\n")
    return "\n".join(lines).strip() or "User: Hello!\nAssistant:"

def _extract_text_from_response(resp) -> str:
    """Best-effort extraction of text from Gemini response across shapes."""
    try:
        txt = getattr(resp, 'text', None)
        if isinstance(txt, str) and txt.strip():
            return txt.strip()
    except Exception:
        pass
    # Fall back to candidates aggregation
    try:
        candidates = getattr(resp, 'candidates', None) or []
        for cand in candidates:
            content = getattr(cand, 'content', None)
            parts = getattr(content, 'parts', None) or []
            texts = []
            for p in parts:
                try:
                    t = getattr(p, 'text', None)
                    if not t and isinstance(p, dict):
                        t = p.get('text')
                    if isinstance(t, str) and t:
                        texts.append(t)
                except Exception:
                    continue
            if texts:
                return "".join(texts).strip()
    except Exception:
        pass
    return ""

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database Configuration
db_url = os.getenv('DATABASE_URL')
if not db_url:
    if os.getenv('RENDER') or os.getenv('PORT'):
        db_url = 'sqlite:///medoralink.db'
    else:
        db_url = 'postgresql://postgres:postgres@localhost:5432/medoralink'
# Support Render/Heroku legacy postgres:// URL scheme
if db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy(app)

class SerializerMixin:
    def to_dict(self):
        d = {}
        for column in self.__table__.columns:
            val = getattr(self, column.name)
            if isinstance(val, (datetime, date)):
                d[column.name] = val.isoformat()
            else:
                d[column.name] = val
        return d

class User(db.Model, SerializerMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='patient')
    phone = db.Column(db.String(50), default='')
    num_meds_requested = db.Column(db.Integer, default=0)
    pending_approval_meds = db.Column(db.JSON, default=list)
    reset_token = db.Column(db.String(255), nullable=True)
    reset_token_expiry = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.String(255), default=lambda: datetime.now().isoformat())

class Medicine(db.Model, SerializerMixin):
    __tablename__ = 'medicines'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), default='')
    generic_name = db.Column(db.String(255), default='')
    description = db.Column(db.Text, default='')
    expire_at = db.Column(db.String(255), nullable=True)
    current_demand = db.Column(db.Integer, default=0)
    required_demand = db.Column(db.Integer, default=20)
    created_at = db.Column(db.String(255), default=lambda: datetime.now().isoformat())

class Wishlist(db.Model, SerializerMixin):
    __tablename__ = 'wishlists'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    medicine_id = db.Column(db.Integer, nullable=False)
    quantity = db.Column(db.Integer, default=1)
    approved = db.Column(db.Boolean, default=False)
    rejected_at = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.String(255), default=lambda: datetime.now().isoformat())

class Donation(db.Model, SerializerMixin):
    __tablename__ = 'donations'
    id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, nullable=True)
    medicine_id = db.Column(db.Integer, nullable=True)
    medicine_name = db.Column(db.String(255), default='')
    quantity = db.Column(db.Integer, default=1)
    quantity_text = db.Column(db.String(255), default='')
    medicine_expires_at = db.Column(db.String(255), nullable=True)
    condition = db.Column(db.String(255), default='')
    doctor_name = db.Column(db.String(255), default='')
    notes = db.Column(db.Text, default='')
    claimed_by = db.Column(db.Integer, nullable=True)
    claimed_at = db.Column(db.String(255), nullable=True)
    claim_status = db.Column(db.String(50), nullable=True)
    claim_decided_at = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.String(255), default=lambda: datetime.now().isoformat())

class Grant(db.Model, SerializerMixin):
    __tablename__ = 'grants'
    id = db.Column(db.Integer, primary_key=True)
    requestor_id = db.Column(db.Integer, nullable=True)
    title = db.Column(db.String(255), default='')
    description = db.Column(db.Text, default='')
    created_at = db.Column(db.String(255), default=lambda: datetime.now().isoformat())

class Profile(db.Model, SerializerMixin):
    __tablename__ = 'profiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, unique=True, nullable=True)
    first_name = db.Column(db.String(255), default='')
    last_name = db.Column(db.String(255), default='')
    phone = db.Column(db.String(50), default='')
    address = db.Column(db.Text, default='')
    emergency_contact = db.Column(db.String(255), default='')
    date_of_birth = db.Column(db.String(255), default='')
    bio = db.Column(db.Text, default='')
    medical_conditions = db.Column(db.JSON, default=list)
    allergies = db.Column(db.JSON, default=list)
    avatar_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.String(255), default=lambda: datetime.now().isoformat())

class Counter(db.Model, SerializerMixin):
    __tablename__ = 'counters'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, unique=True, nullable=True)
    medicine_purchases = db.Column(db.Integer, default=0)
    donations = db.Column(db.Integer, default=0)
    grant_given = db.Column(db.Integer, default=0)
    created_at = db.Column(db.String(255), default=lambda: datetime.now().isoformat())

class Notification(db.Model, SerializerMixin):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)
    type = db.Column(db.String(100), default='')
    title = db.Column(db.String(255), default='')
    message = db.Column(db.Text, default='')
    read = db.Column(db.Boolean, default=False)
    action_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.String(255), default=lambda: datetime.now().isoformat())

class Transaction(db.Model, SerializerMixin):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)
    type = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    note = db.Column(db.Text, default='')
    created_at = db.Column(db.String(255), default=lambda: datetime.now().isoformat())

class DemoData(db.Model, SerializerMixin):
    __tablename__ = 'demo_data'
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.String(255), default=lambda: datetime.now().isoformat())

MODEL_MAP = {
    'users': User,
    'medicines': Medicine,
    'wishlists': Wishlist,
    'donations': Donation,
    'grants': Grant,
    'profiles': Profile,
    'counters': Counter,
    'notifications': Notification,
    'transactions': Transaction,
    'demoData': DemoData
}

def seed_db():
    if User.query.first() is None:
        users_to_seed = [
            {
                "email": "a",
                "password": "a",
                "role": "patient",
                "phone": "",
                "num_meds_requested": 0,
                "pending_approval_meds": [],
                "created_at": datetime.now().isoformat()
            },
            {
                "email": "sifat@gmail.com",
                "password": "s",
                "role": "patient",
                "phone": "",
                "num_meds_requested": 0,
                "pending_approval_meds": [],
                "created_at": datetime.now().isoformat()
            },
            {
                "email": "nafi@united.health",
                "password": "111",
                "role": "doctor",
                "phone": "",
                "num_meds_requested": 0,
                "pending_approval_meds": [],
                "created_at": datetime.now().isoformat()
            }
        ]
        
        profiles_to_seed = {
            "a": {
                "first_name": "Patient",
                "last_name": "A",
                "phone": "",
                "address": "",
                "emergency_contact": "",
                "date_of_birth": "",
                "bio": "Quick login user A.",
                "medical_conditions": [],
                "allergies": [],
                "created_at": datetime.now().isoformat()
            },
            "sifat@gmail.com": {
                "first_name": "Sifat",
                "last_name": "Patient",
                "phone": "",
                "address": "",
                "emergency_contact": "",
                "date_of_birth": "",
                "bio": "Patient Sifat.",
                "medical_conditions": [],
                "allergies": [],
                "created_at": datetime.now().isoformat()
            },
            "nafi@united.health": {
                "first_name": "Nafi",
                "last_name": "Doctor",
                "phone": "",
                "address": "",
                "emergency_contact": "",
                "date_of_birth": "",
                "bio": "Approving doctor nafi.",
                "medical_conditions": [],
                "allergies": [],
                "created_at": datetime.now().isoformat()
            }
        }
        
        for u_data in users_to_seed:
            email = u_data["email"]
            user = User(
                email=email,
                password=u_data["password"],
                role=u_data["role"],
                phone=u_data["phone"],
                num_meds_requested=u_data["num_meds_requested"],
                pending_approval_meds=u_data["pending_approval_meds"],
                created_at=u_data["created_at"]
            )
            db.session.add(user)
            db.session.flush()
            
            p_data = profiles_to_seed.get(email)
            if p_data:
                profile = Profile(
                    user_id=user.id,
                    first_name=p_data["first_name"],
                    last_name=p_data["last_name"],
                    phone=p_data["phone"],
                    address=p_data["address"],
                    emergency_contact=p_data["emergency_contact"],
                    date_of_birth=p_data["date_of_birth"],
                    bio=p_data["bio"],
                    medical_conditions=p_data.get("medical_conditions", []),
                    allergies=p_data.get("allergies", []),
                    avatar_url=p_data.get("avatar_url"),
                    created_at=p_data["created_at"]
                )
                db.session.add(profile)
                
                counter = Counter(
                    user_id=user.id,
                    medicine_purchases=0,
                    donations=0,
                    grant_given=0,
                    created_at=datetime.now().isoformat()
                )
                db.session.add(counter)
                
        medicines_to_seed = [
            {
                "name": "Amoxicillin 500mg",
                "generic_name": "Amoxicillin",
                "description": "Antibiotic used to treat bacterial infections.",
                "created_at": "2026-05-18T00:00:00.000Z",
                "expire_at": "2027-06-01",
                "current_demand": 0,
                "required_demand": 20
            },
            {
                "name": "Ibuprofen 200mg",
                "generic_name": "Ibuprofen",
                "description": "NSAID pain reliever and fever reducer.",
                "created_at": "2026-05-18T00:00:00.000Z",
                "expire_at": "2027-12-31",
                "current_demand": 0,
                "required_demand": 20
            },
            {
                "name": "Metformin 500mg",
                "generic_name": "Metformin",
                "description": "Type 2 diabetes medication to control blood sugar.",
                "created_at": "2026-05-18T00:00:00.000Z",
                "expire_at": "2028-03-15",
                "current_demand": 0,
                "required_demand": 25
            },
            {
                "name": "Insulin Glargine (Lantus) 100 units/mL",
                "generic_name": "Insulin Glargine",
                "description": "Long-acting insulin for diabetes management.",
                "created_at": "2026-05-18T00:00:00.000Z",
                "expire_at": "2027-02-10",
                "current_demand": 0,
                "required_demand": 30
            },
            {
                "name": "Napa Paracetamol 300mg",
                "generic_name": "Napa Paracetamol",
                "description": "Pain relief and fever treatment.",
                "created_at": "2026-05-18T00:00:00.000Z",
                "expire_at": "2027-09-01",
                "current_demand": 0,
                "required_demand": 15
            },
            {
                "name": "Trastuzumab (Herceptin) 150mg",
                "generic_name": "Trastuzumab",
                "description": "Breast cancer monoclonal antibody therapy.",
                "created_at": "2026-05-18T00:00:00.000Z",
                "expire_at": "2027-08-20",
                "current_demand": 0,
                "required_demand": 22
            },
            {
                "name": "Pembrolizumab (Keytruda) 100mg",
                "generic_name": "Pembrolizumab",
                "description": "Immunotherapy for oncology treatments.",
                "created_at": "2026-05-18T00:00:00.000Z",
                "expire_at": "2027-11-11",
                "current_demand": 0,
                "required_demand": 18
            }
        ]
        
        for m_data in medicines_to_seed:
            med = Medicine(
                name=m_data["name"],
                generic_name=m_data["generic_name"],
                description=m_data["description"],
                created_at=m_data["created_at"],
                expire_at=m_data["expire_at"],
                current_demand=m_data["current_demand"],
                required_demand=m_data["required_demand"]
            )
            db.session.add(med)
            
        db.session.commit()

def create_database_if_not_exists(conn_str):
    import urllib.parse
    import psycopg2
    from psycopg2.extensions import quote_ident
    
    result = urllib.parse.urlparse(conn_str)
    dbname = result.path.lstrip('/')
    if not dbname or result.scheme != 'postgresql':
        return
        
    postgres_conn_str = f"postgresql://{result.netloc}/postgres"
    
    try:
        conn = psycopg2.connect(conn_str)
        conn.close()
    except psycopg2.OperationalError as e:
        err_msg = str(e)
        if "does not exist" in err_msg or "3D000" in err_msg:
            try:
                conn = psycopg2.connect(postgres_conn_str)
                conn.autocommit = True
                cursor = conn.cursor()
                cursor.execute(f"CREATE DATABASE {quote_ident(dbname, conn)}")
                cursor.close()
                conn.close()
                print(f"Database '{dbname}' created successfully.")
            except Exception as create_err:
                print(f"Failed to auto-create database '{dbname}': {create_err}")
                raise e
        else:
            raise e

# Automatically initialize and seed DB
with app.app_context():
    try:
        create_database_if_not_exists(app.config['SQLALCHEMY_DATABASE_URI'])
    except Exception as e:
        print(f"Database auto-creation or connection check failed: {e}")
    db.create_all()
    
    # Remove existing seeded user user@example.com if present so they can sign up fresh
    try:
        u = User.query.filter(User.email == 'user@example.com').first()
        if u:
            Profile.query.filter(Profile.user_id == u.id).delete()
            Counter.query.filter(Counter.user_id == u.id).delete()
            db.session.delete(u)
            db.session.commit()
            print("Removed existing seeded user user@example.com on startup.")
    except Exception as e:
        print(f"Startup cleanup failed: {e}")
        db.session.rollback()

    seed_db()

@app.route('/api/data', methods=['GET'])
def get_data():
    """Get all stored demo data"""
    items = DemoData.query.all()
    data = [item.to_dict() for item in items]
    return jsonify({
        'message': 'Data retrieved successfully',
        'data': data,
        'count': len(data)
    })

@app.route('/api/data', methods=['POST'])
def add_data():
    """Add new demo data"""
    try:
        request_data = request.get_json()
        
        if not request_data or 'text' not in request_data:
            return jsonify({'error': 'Text field is required'}), 400
        
        new_entry = DemoData(
            text=request_data['text'],
            timestamp=datetime.now().isoformat()
        )
        db.session.add(new_entry)
        db.session.commit()
        
        return jsonify({
            'message': 'Data saved successfully',
            'data': new_entry.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to save data: {str(e)}'}), 500

@app.route('/api/data/<int:data_id>', methods=['DELETE'])
def delete_data(data_id):
    """Delete specific demo data entry"""
    try:
        entry = db.session.get(DemoData, data_id)
        if entry:
            db.session.delete(entry)
            db.session.commit()
        return jsonify({'message': 'Data deleted successfully'})
        
    except Exception as e:
        return jsonify({'error': f'Failed to delete data: {str(e)}'}), 500

@app.route('/api/clear', methods=['POST'])
def clear_all_data():
    """Clear all demo data"""
    try:
        DemoData.query.delete()
        db.session.commit()
        return jsonify({'message': 'All data cleared successfully'})
    except Exception as e:
        return jsonify({'error': f'Failed to clear data: {str(e)}'}), 500

# -----------------------------
# Chatbot (Gemini) endpoint
# -----------------------------

@app.route('/api/chat', methods=['POST'])
def chat_route():
    try:
        # Lazy import so the server can run without the dependency when not used
        try:
            import google.generativeai as _genai  # type: ignore
        except Exception as e:
            return jsonify({'error': 'Chat dependency not installed on server'}), 500

        # Accept both JSON and form-data
        if request.content_type and 'multipart/form-data' in request.content_type:
            raw_messages = request.form.get('messages')
            import json as _json
            messages = _json.loads(raw_messages) if raw_messages else []
        else:
            messages = request.json.get('messages', []) if request.is_json else []

        prompt = _collapse_messages_for_llm(messages)

        # If a file is attached, prepend a note
        uploaded_file = None
        try:
            uploaded_file = request.files.get('file')
        except Exception:
            uploaded_file = None
        if uploaded_file is not None:
            prompt = f"[User uploaded file: {uploaded_file.filename}]\n" + prompt

        # Add a system priming for healthcare advisor
        system_instruction = (
            "You are MedoraLink, a compassionate healthcare advisor assistant. "
            "Prefer brevity (1–2 sentences). For greetings, give a short friendly reply and a concise follow-up question. "
            "Only reference user documents if the user asks or context clearly requires it. "
            "Add safety disclaimers only when giving medical advice or discussing risks."
        )
        full_prompt = f"[System]\n{system_instruction}\n\n{prompt}"

        api_key, model_name = _get_gemini_config()
        # Fallback response when GEMINI_API_KEY is missing
        if not api_key:
            reply = (
                "I'm your MedoraLink healthcare assistant. I can't access AI right now, "
                "but I can help summarize and guide you based on your message and uploaded document names. "
                "Please consult a licensed clinician for medical decisions."
            )
            return jsonify({'reply': reply})

        _genai.configure(api_key=api_key)

        # Quick mode support for faster, shorter outputs
        quick = False
        try:
            if request.content_type and 'multipart/form-data' in (request.content_type or ''):
                quick = (request.form.get('quick') == '1')
            elif request.is_json:
                quick = bool((request.json or {}).get('quick'))
        except Exception:
            quick = False

        model = _genai.GenerativeModel(model_name)
        if quick:
            resp = model.generate_content(full_prompt, generation_config={
                'max_output_tokens': 120,
                'temperature': 0.4,
                'top_p': 0.8,
                'top_k': 40,
            })
        else:
            resp = model.generate_content(full_prompt)
        # Robust extraction across shapes
        reply = _extract_text_from_response(resp)
        # If quick mode produced no text, fall back to a standard generation
        if quick and not reply:
            try:
                resp_full = model.generate_content(full_prompt)
                reply = _extract_text_from_response(resp_full)
            except Exception:
                pass
        if not reply:
            reply = "I couldn't generate a response. Please try again."
        return jsonify({'reply': reply})
    except Exception as e:
        err_msg = str(e)
        if "RESOURCE_EXHAUSTED" in err_msg or "429" in err_msg or "quota" in err_msg.lower():
            quota_reply = (
                "I'm your MedoraLink assistant. The AI service is currently experiencing high demand or has reached its rate limits. "
                "Please wait a moment before sending another message, or check your Gemini API quota settings in the developer console."
            )
            return jsonify({'reply': quota_reply})
        if "API_KEY_INVALID" in err_msg or "API key expired" in err_msg or "invalid API key" in err_msg.lower() or "400" in err_msg:
            fallback_reply = (
                "I'm your MedoraLink healthcare assistant. The AI assistant is currently in offline mode "
                "due to an expired or missing Google API key. Please configure a valid key in your backend .env file. "
                "For now, please consult a licensed clinician for any medical decisions."
            )
            return jsonify({'reply': fallback_reply})
        return jsonify({'error': err_msg}), 500

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream_route():
    """Server-Sent Events streaming endpoint for faster perceived responses."""
    try:
        try:
            import google.generativeai as _genai  # type: ignore
        except Exception:
            return jsonify({'error': 'Chat dependency not installed on server'}), 500

        # Accept JSON only for streaming for simplicity
        if not request.is_json:
            return jsonify({'error': 'application/json required'}), 400
        messages = request.json.get('messages', [])
        quick = bool(request.json.get('quick', False))

        prompt = _collapse_messages_for_llm(messages)

        system_instruction = (
            "You are MedoraLink, a compassionate healthcare advisor assistant. "
            "Prefer brevity (1–2 sentences). For greetings, give a short friendly reply and a concise follow-up question. "
            "Only reference user documents if the user asks or context clearly requires it. "
            "Add safety disclaimers only when giving medical advice or discussing risks."
        )
        full_prompt = f"[System]\n{system_instruction}\n\n{prompt}"

        api_key, model_name = _get_gemini_config()
        if not api_key:
            # Stream a single fallback message
            def _fallback_gen():
                yield "data: I'm your MedoraLink assistant. AI is unavailable right now.\n\n"
                yield "event: done\ndata: [DONE]\n\n"
            return Response(_fallback_gen(), mimetype='text/event-stream', headers={
                'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'
            })

        _genai.configure(api_key=api_key)

        model = _genai.GenerativeModel(model_name)
        gen_cfg = {'max_output_tokens': 120, 'temperature': 0.4, 'top_p': 0.8, 'top_k': 40} if quick else None

        def event_stream():
            try:
                if gen_cfg:
                    responses = model.generate_content(full_prompt, stream=True, generation_config=gen_cfg)
                else:
                    responses = model.generate_content(full_prompt, stream=True)
                for chunk in responses:
                    try:
                        piece = _extract_text_from_response(chunk)
                        if piece:
                            yield f"data: {json.dumps({'text': piece})}\n\n"
                    except Exception:
                        continue
                yield "event: done\ndata: [DONE]\n\n"
            except Exception as e:
                err_msg = str(e)
                if "RESOURCE_EXHAUSTED" in err_msg or "429" in err_msg or "quota" in err_msg.lower():
                    quota_reply = (
                        "I'm your MedoraLink assistant. The AI service is currently experiencing high demand or has reached its rate limits. "
                        "Please wait a moment before sending another message."
                    )
                    yield f"data: {quota_reply}\n\n"
                    yield "event: done\ndata: [DONE]\n\n"
                elif "API_KEY_INVALID" in err_msg or "API key expired" in err_msg or "invalid API key" in err_msg.lower() or "400" in err_msg:
                    fallback_reply = (
                        "I'm your MedoraLink healthcare assistant. The AI assistant is currently in offline mode "
                        "due to an expired or missing Google API key. Please configure a valid key in your backend .env file. "
                        "For now, please consult a licensed clinician for any medical decisions."
                    )
                    yield f"data: {fallback_reply}\n\n"
                    yield "event: done\ndata: [DONE]\n\n"
                else:
                    yield f"event: error\ndata: {err_msg}\n\n"
        return Response(event_stream(), mimetype='text/event-stream', headers={
            'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'
        })
    except Exception as e:
        err_msg = str(e)
        if "RESOURCE_EXHAUSTED" in err_msg or "429" in err_msg or "quota" in err_msg.lower():
            quota_reply = (
                "I'm your MedoraLink assistant. The AI service is currently experiencing high demand or has reached its rate limits. "
                "Please wait a moment before sending another message."
            )
            return jsonify({'reply': quota_reply})
        if "API_KEY_INVALID" in err_msg or "API key expired" in err_msg or "invalid API key" in err_msg.lower() or "400" in err_msg:
            fallback_reply = (
                "I'm your MedoraLink healthcare assistant. The AI assistant is currently in offline mode "
                "due to an expired or missing Google API key. Please configure a valid key in your backend .env file. "
                "For now, please consult a licensed clinician for any medical decisions."
            )
            return jsonify({'reply': fallback_reply})
        return jsonify({'error': err_msg}), 500

# -----------------------------
# Generic helpers for CRUD
# -----------------------------

def _find_by_id(collection_name, item_id):
    model_class = MODEL_MAP[collection_name]
    return db.session.get(model_class, int(item_id))

def _list_items(collection):
    model_class = MODEL_MAP[collection]
    query = model_class.query
    # Basic filtering by simple equality on query params
    if request.args:
        for key, value in request.args.items():
            if key == 'query':
                continue
            if hasattr(model_class, key):
                query = query.filter(getattr(model_class, key) == value)
    items = query.all()
    return jsonify([item.to_dict() for item in items])

def _get_item(collection, item_id):
    model_class = MODEL_MAP[collection]
    item = db.session.get(model_class, int(item_id))
    if not item:
        singular = collection[:-1].capitalize() if collection.endswith('s') else collection.capitalize()
        return jsonify({'error': f'{singular} not found'}), 404
    return jsonify(item.to_dict())

def _create_item(collection, payload, defaults=None):
    model_class = MODEL_MAP[collection]
    merged = {**(defaults or {}), **(payload or {})}
    # Keep only valid model attributes (skip ID so database handles autoincrement)
    column_names = {c.name for c in model_class.__table__.columns}
    filtered_payload = {k: v for k, v in merged.items() if k in column_names and k != 'id'}
    
    item = model_class(**filtered_payload)
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

def _update_item(collection, item_id, payload):
    model_class = MODEL_MAP[collection]
    item = db.session.get(model_class, int(item_id))
    if not item:
        singular = collection[:-1].capitalize() if collection.endswith('s') else collection.capitalize()
        return jsonify({'error': f'{singular} not found'}), 404
    
    column_names = {c.name for c in model_class.__table__.columns}
    for k, v in (payload or {}).items():
        if k != 'id' and k in column_names:
            setattr(item, k, v)
    db.session.commit()
    return jsonify(item.to_dict())

def _delete_item(collection, item_id):
    model_class = MODEL_MAP[collection]
    item = db.session.get(model_class, int(item_id))
    if not item:
        singular = collection[:-1].capitalize() if collection.endswith('s') else collection.capitalize()
        return jsonify({'error': f'{singular} not found'}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Deleted successfully'})

# -----------------------------
# Users
# -----------------------------

@app.route('/api/users', methods=['GET'])
def list_users():
    return _list_items('users')

@app.route('/api/users/<int:item_id>', methods=['GET'])
def get_user(item_id):
    return _get_item('users', item_id)

@app.route('/api/users', methods=['POST'])
def create_user():
    payload = request.get_json() or {}
    if 'email' not in payload or 'password' not in payload:
        return jsonify({'error': 'email and password are required'}), 400
    email = payload.get('email', '').strip().lower()
    existing_user = User.query.filter(User.email.ilike(email)).first()
    if existing_user:
        return jsonify({'error': 'Email is already registered'}), 400
    payload.setdefault('role', 'patient')
    payload.setdefault('phone', '')
    payload.setdefault('num_meds_requested', 0)
    payload.setdefault('pending_approval_meds', [])
    return _create_item('users', payload)

@app.route('/api/users/<int:item_id>', methods=['PUT', 'PATCH'])
def update_user(item_id):
    payload = request.get_json() or {}
    return _update_item('users', item_id, payload)

@app.route('/api/users/<int:item_id>', methods=['DELETE'])
def delete_user(item_id):
    return _delete_item('users', item_id)

# -----------------------------
# Medicines
# -----------------------------

@app.route('/api/medicines', methods=['GET'])
def list_medicines():
    query_str = (request.args.get('query') or '').strip().lower()
    q = Medicine.query
    if query_str:
        q = q.filter(
            db.or_(
                Medicine.name.ilike(f'%{query_str}%'),
                Medicine.generic_name.ilike(f'%{query_str}%')
            )
        )
    for key, value in request.args.items():
        if key == 'query':
            continue
        if hasattr(Medicine, key):
            q = q.filter(getattr(Medicine, key) == value)
    items = q.all()
    return jsonify([item.to_dict() for item in items])

@app.route('/api/medicines/<int:item_id>', methods=['GET'])
def get_medicine(item_id):
    return _get_item('medicines', item_id)

@app.route('/api/medicines', methods=['POST'])
def create_medicine():
    payload = request.get_json() or {}
    defaults = {
        'name': payload.get('name', ''),
        'generic_name': payload.get('generic_name', ''),
        'description': payload.get('description', ''),
        'expire_at': payload.get('expire_at', None),
        'current_demand': payload.get('current_demand', 0),
        'required_demand': payload.get('required_demand', 20),
    }
    return _create_item('medicines', payload, defaults=defaults)

@app.route('/api/medicines/<int:item_id>', methods=['PUT', 'PATCH'])
def update_medicine(item_id):
    payload = request.get_json() or {}
    return _update_item('medicines', item_id, payload)

@app.route('/api/medicines/<int:item_id>', methods=['DELETE'])
def delete_medicine(item_id):
    return _delete_item('medicines', item_id)

# -----------------------------
# Wishlists
# -----------------------------

@app.route('/api/wishlists', methods=['GET'])
def list_wishlists():
    return _list_items('wishlists')

@app.route('/api/wishlists/<int:item_id>', methods=['GET'])
def get_wishlist(item_id):
    return _get_item('wishlists', item_id)

@app.route('/api/wishlists', methods=['POST'])
def create_wishlist():
    payload = request.get_json() or {}
    defaults = {
        'user_id': payload.get('user_id'),
        'medicine_id': payload.get('medicine_id'),
        'quantity': payload.get('quantity', 1),
        'approved': payload.get('approved', False),
    }
    response = _create_item('wishlists', payload, defaults=defaults)
    try:
        med_id = defaults.get('medicine_id')
        if med_id:
            med = db.session.get(Medicine, int(med_id))
            if med is not None:
                med.current_demand = int(med.current_demand or 0) + 1
                db.session.commit()
        
        notif_payload = {
            'user_id': defaults.get('user_id'),
            'type': 'wishlist',
            'title': 'Added to Wishlist',
            'message': f"Your request for {med.name if med else 'medicine'} was added to wishlist.",
            'read': False,
        }
        _create_item('notifications', notif_payload)
    except Exception as e:
        print(f"Error in wishlist creation action: {e}")
    return response

@app.route('/api/wishlists/<int:item_id>', methods=['PUT', 'PATCH'])
def update_wishlist(item_id):
    payload = request.get_json() or {}
    return _update_item('wishlists', item_id, payload)

@app.route('/api/wishlists/<int:item_id>', methods=['DELETE'])
def delete_wishlist(item_id):
    return _delete_item('wishlists', item_id)

# -----------------------------
# Donations
# -----------------------------

@app.route('/api/donations', methods=['GET'])
def list_donations():
    query_str = (request.args.get('query') or '').strip().lower()
    q = Donation.query
    if query_str:
        matching_med_ids = [m.id for m in Medicine.query.filter(
            db.or_(
                Medicine.name.ilike(f'%{query_str}%'),
                Medicine.generic_name.ilike(f'%{query_str}%')
            )
        ).all()]
        if matching_med_ids:
            q = q.filter(
                db.or_(
                    Donation.medicine_id.in_(matching_med_ids),
                    Donation.medicine_name.ilike(f'%{query_str}%')
                )
            )
        else:
            q = q.filter(Donation.medicine_name.ilike(f'%{query_str}%'))
            
    for key, value in request.args.items():
        if key == 'query':
            continue
        if hasattr(Donation, key):
            q = q.filter(getattr(Donation, key) == value)
    items = q.all()
    return jsonify([item.to_dict() for item in items])

@app.route('/api/donations/<int:item_id>', methods=['GET'])
def get_donation(item_id):
    return _get_item('donations', item_id)

@app.route('/api/donations', methods=['POST'])
def create_donation():
    payload = request.get_json() or {}
    try:
        if not payload.get('medicine_id') and payload.get('medicine_name'):
            name_q = str(payload.get('medicine_name', '')).strip().lower()
            if name_q:
                match = Medicine.query.filter(
                    db.or_(
                        Medicine.name.ilike(f'%{name_q}%'),
                        Medicine.generic_name.ilike(f'%{name_q}%')
                    )
                ).first()
                if match:
                    payload['medicine_id'] = match.id
    except Exception as e:
        print(f"Error resolving medicine_id in create_donation: {e}")
        
    raw_qty = payload.get('quantity', 1)
    qty = 1
    try:
        if isinstance(raw_qty, str):
            digits = ''.join(ch for ch in raw_qty if ch.isdigit())
            qty = int(digits) if digits else 1
        else:
            qty = int(raw_qty)
    except Exception:
        qty = 1
    defaults = {
        'donor_id': payload.get('donor_id'),
        'medicine_id': payload.get('medicine_id'),
        'medicine_name': payload.get('medicine_name', ''),
        'quantity': qty,
        'quantity_text': payload.get('quantity_text', raw_qty if isinstance(raw_qty, str) else ''),
        'medicine_expires_at': payload.get('medicine_expires_at', None),
        'condition': payload.get('condition', ''),
        'doctor_name': payload.get('doctor_name', ''),
        'notes': payload.get('notes', ''),
    }
    return _create_item('donations', payload, defaults=defaults)

@app.route('/api/donations/<int:item_id>', methods=['PUT', 'PATCH'])
def update_donation(item_id):
    payload = request.get_json() or {}
    return _update_item('donations', item_id, payload)

@app.route('/api/donations/<int:item_id>', methods=['DELETE'])
def delete_donation(item_id):
    return _delete_item('donations', item_id)

# -----------------------------
# Grants
# -----------------------------

@app.route('/api/grants', methods=['GET'])
def list_grants():
    return _list_items('grants')

@app.route('/api/grants/<int:item_id>', methods=['GET'])
def get_grant(item_id):
    return _get_item('grants', item_id)

@app.route('/api/grants', methods=['POST'])
def create_grant():
    payload = request.get_json() or {}
    defaults = {
        'requestor_id': payload.get('requestor_id'),
        'title': payload.get('title', ''),
        'description': payload.get('description', ''),
    }
    return _create_item('grants', payload, defaults=defaults)

@app.route('/api/grants/<int:item_id>', methods=['PUT', 'PATCH'])
def update_grant(item_id):
    payload = request.get_json() or {}
    return _update_item('grants', item_id, payload)

@app.route('/api/grants/<int:item_id>', methods=['DELETE'])
def delete_grant(item_id):
    return _delete_item('grants', item_id)

# -----------------------------
# Profiles
# -----------------------------

@app.route('/api/profiles', methods=['GET'])
def list_profiles():
    return _list_items('profiles')

@app.route('/api/profiles/<int:item_id>', methods=['GET'])
def get_profile(item_id):
    return _get_item('profiles', item_id)

@app.route('/api/profiles', methods=['POST'])
def create_profile():
    payload = request.get_json() or {}
    defaults = {
        'first_name': payload.get('first_name', ''),
        'last_name': payload.get('last_name', ''),
        'phone': payload.get('phone', ''),
        'address': payload.get('address', ''),
        'emergency_contact': payload.get('emergency_contact', ''),
        'date_of_birth': payload.get('date_of_birth', ''),
        'bio': payload.get('bio', ''),
        'medical_conditions': payload.get('medical_conditions', []),
        'allergies': payload.get('allergies', []),
        'user_id': payload.get('user_id'),
    }
    return _create_item('profiles', payload, defaults=defaults)

@app.route('/api/profiles/<int:item_id>', methods=['PUT', 'PATCH'])
def update_profile(item_id):
    payload = request.get_json() or {}
    return _update_item('profiles', item_id, payload)

@app.route('/api/profiles/<int:item_id>', methods=['DELETE'])
def delete_profile(item_id):
    return _delete_item('profiles', item_id)

# -----------------------------
# Counters (per-user activity counters)
# -----------------------------

@app.route('/api/counters', methods=['GET'])
def list_counters():
    return _list_items('counters')

@app.route('/api/counters/<int:item_id>', methods=['GET'])
def get_counter(item_id):
    return _get_item('counters', item_id)

@app.route('/api/counters', methods=['POST'])
def create_counter():
    payload = request.get_json() or {}
    defaults = {
        'user_id': payload.get('user_id'),
        'medicine_purchases': payload.get('medicine_purchases', 0),
        'donations': payload.get('donations', 0),
        'grant_given': payload.get('grant_given', 0),
    }
    return _create_item('counters', payload, defaults=defaults)

@app.route('/api/counters/<int:item_id>', methods=['PUT', 'PATCH'])
def update_counter(item_id):
    payload = request.get_json() or {}
    return _update_item('counters', item_id, payload)

@app.route('/api/counters/<int:item_id>', methods=['DELETE'])
def delete_counter(item_id):
    return _delete_item('counters', item_id)

# -----------------------------
# Notifications
# -----------------------------

@app.route('/api/notifications', methods=['GET'])
def list_notifications():
    return _list_items('notifications')

@app.route('/api/notifications/<int:item_id>', methods=['GET'])
def get_notification(item_id):
    return _get_item('notifications', item_id)

@app.route('/api/notifications', methods=['POST'])
def create_notification():
    payload = request.get_json() or {}
    defaults = {
        'user_id': payload.get('user_id'),
        'type': payload.get('type', ''),
        'title': payload.get('title', ''),
        'message': payload.get('message', ''),
        'read': payload.get('read', False),
    }
    return _create_item('notifications', payload, defaults=defaults)

@app.route('/api/notifications/<int:item_id>', methods=['PUT', 'PATCH'])
def update_notification(item_id):
    payload = request.get_json() or {}
    return _update_item('notifications', item_id, payload)

@app.route('/api/notifications/<int:item_id>', methods=['DELETE'])
def delete_notification(item_id):
    return _delete_item('notifications', item_id)

@app.route('/api/notifications/clear', methods=['POST'])
def clear_notifications():
    """Clear all notifications or mark as read. Query param action=delete|read (default read). Optional user_id filter."""
    action = request.args.get('action', 'read')
    user_id = request.args.get('user_id')
    q = Notification.query
    if user_id is not None:
        q = q.filter(Notification.user_id == int(user_id))

    if action == 'delete':
        q.delete(synchronize_session=False)
        db.session.commit()
        return jsonify({'message': 'Notifications cleared'})
    else:
        q.update({Notification.read: True}, synchronize_session=False)
        db.session.commit()
        return jsonify({'message': 'Notifications marked as read'})

# -----------------------------
# Transactions & Fund Summary
# -----------------------------

@app.route('/api/transactions', methods=['GET'])
def list_transactions():
    return _list_items('transactions')

@app.route('/api/transactions', methods=['POST'])
def create_transaction():
    payload = request.get_json() or {}
    tx_type = payload.get('type')
    amount = payload.get('amount')
    if tx_type not in ['contribution', 'disbursement']:
        return jsonify({'error': 'type must be contribution or disbursement'}), 400
    try:
        amount = float(amount)
    except Exception:
        return jsonify({'error': 'amount must be a number'}), 400
    if amount <= 0:
        return jsonify({'error': 'amount must be > 0'}), 400
    defaults = {
        'user_id': payload.get('user_id'),
        'type': tx_type,
        'amount': amount,
        'note': payload.get('note', ''),
    }
    return _create_item('transactions', payload, defaults=defaults)

@app.route('/api/fund/summary', methods=['GET'])
def fund_summary():
    contrib_sum = db.session.query(db.func.sum(Transaction.amount)).filter(Transaction.type == 'contribution').scalar() or 0
    disburse_sum = db.session.query(db.func.sum(Transaction.amount)).filter(Transaction.type == 'disbursement').scalar() or 0
    balance = float(contrib_sum) - float(disburse_sum)
    recent = Transaction.query.order_by(Transaction.created_at.desc()).limit(10).all()
    return jsonify({
        'balance': balance,
        'total_contributions': float(contrib_sum),
        'total_disbursements': float(disburse_sum),
        'recent': [t.to_dict() for t in recent],
    })

# -----------------------------
# Actions: Donation Claim & Wishlist Approve
# -----------------------------

@app.route('/api/donations/<int:item_id>/claim', methods=['POST'])
def claim_donation(item_id):
    payload = request.get_json() or {}
    user_id = payload.get('user_id')
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    donation = db.session.get(Donation, int(item_id))
    if not donation:
        return jsonify({'error': 'Donation not found'}), 404
    if donation.claimed_by:
        return jsonify({'error': 'Donation already claimed'}), 400
        
    donation.claimed_by = int(user_id)
    donation.claimed_at = datetime.now().isoformat()
    donation.claim_status = 'pending'
    db.session.commit()
    
    try:
        med_name = donation.medicine_name
        if not med_name and donation.medicine_id:
            med = db.session.get(Medicine, int(donation.medicine_id))
            med_name = med.name if med else f"donation #{item_id}"
        if not med_name:
            med_name = f"donation #{item_id}"
    except Exception:
        med_name = f"donation #{item_id}"
        
    _create_item('notifications', {
        'user_id': user_id,
        'type': 'donation',
        'title': 'Request Submitted',
        'message': f"You requested {med_name}.",
    })
    return jsonify({'message': 'Donation claimed'})

@app.route('/api/wishlists/<int:item_id>/approve', methods=['POST'])
def approve_wishlist(item_id):
    item = db.session.get(Wishlist, int(item_id))
    if not item:
        return jsonify({'error': 'Wishlist not found'}), 404
    if item.approved is True:
        return jsonify({'message': 'Already approved'})
        
    item.approved = True
    db.session.commit()
    
    try:
        med = db.session.get(Medicine, int(item.medicine_id))
        med_name = med.name if med else f"medicine #{item.medicine_id}"
    except Exception:
        med_name = f"medicine #{item.medicine_id}"
        
    _create_item('notifications', {
        'user_id': item.user_id,
        'type': 'approval',
        'title': 'Request Approved',
        'message': f"Your request for {med_name} has been approved.",
        'action_url': f"/checkout/{item.medicine_id}",
    })
    return jsonify(item.to_dict())

@app.route('/api/wishlists/<int:item_id>/reject', methods=['POST'])
def reject_wishlist(item_id):
    item = db.session.get(Wishlist, int(item_id))
    if not item:
        return jsonify({'error': 'Wishlist not found'}), 404
    
    item.approved = False
    item.rejected_at = datetime.now().isoformat()
    db.session.commit()
    
    try:
        med = db.session.get(Medicine, int(item.medicine_id))
        med_name = med.name if med else f"medicine #{item.medicine_id}"
    except Exception:
        med_name = f"medicine #{item.medicine_id}"
        
    _create_item('notifications', {
        'user_id': item.user_id,
        'type': 'approval',
        'title': 'Request Rejected',
        'message': f"Your request for {med_name} was not approved at this time.",
    })
    return jsonify(item.to_dict())

@app.route('/api/donations/<int:item_id>/approve-claim', methods=['POST'])
def approve_donation_claim(item_id):
    donation = db.session.get(Donation, int(item_id))
    if not donation:
        return jsonify({'error': 'Donation not found'}), 404
    if not donation.claimed_by:
        return jsonify({'error': 'No pending claim'}), 400
        
    donation.claim_status = 'approved'
    donation.claim_decided_at = datetime.now().isoformat()
    db.session.commit()
    
    try:
        med_name = donation.medicine_name
        if not med_name and donation.medicine_id:
            med = db.session.get(Medicine, int(donation.medicine_id))
            med_name = med.name if med else f"donation #{item_id}"
        if not med_name:
            med_name = f"donation #{item_id}"
    except Exception:
        med_name = f"donation #{item_id}"
        
    _create_item('notifications', {
        'user_id': donation.claimed_by,
        'type': 'donation',
        'title': 'Request Approved',
        'message': f"Your request for {med_name} was approved.",
        'action_url': f"/donate-meds?highlight={item_id}",
    })
    return jsonify(donation.to_dict())

@app.route('/api/donations/<int:item_id>/reject-claim', methods=['POST'])
def reject_donation_claim(item_id):
    donation = db.session.get(Donation, int(item_id))
    if not donation:
        return jsonify({'error': 'Donation not found'}), 404
    if not donation.claimed_by:
        return jsonify({'error': 'No pending claim'}), 400
    
    user_id = donation.claimed_by
    donation.claim_status = 'rejected'
    donation.claim_decided_at = datetime.now().isoformat()
    db.session.commit()
    
    try:
        med_name = donation.medicine_name
        if not med_name and donation.medicine_id:
            med = db.session.get(Medicine, int(donation.medicine_id))
            med_name = med.name if med else f"donation #{item_id}"
        if not med_name:
            med_name = f"donation #{item_id}"
    except Exception:
        med_name = f"donation #{item_id}"
        
    _create_item('notifications', {
        'user_id': user_id,
        'type': 'donation',
        'title': 'Request Rejected',
        'message': f"Your request for {med_name} was rejected.",
    })
    return jsonify(donation.to_dict())

# Allow a user to cancel their pending claim
@app.route('/api/donations/<int:item_id>/cancel-claim', methods=['POST'])
def cancel_donation_claim(item_id):
    payload = request.get_json() or {}
    user_id = payload.get('user_id')
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    donation = db.session.get(Donation, int(item_id))
    if not donation:
        return jsonify({'error': 'Donation not found'}), 404
    if donation.claimed_by != int(user_id):
        return jsonify({'error': 'Not your request to cancel'}), 403
    if donation.claim_status not in (None, 'pending'):
        return jsonify({'error': 'Cannot cancel after decision'}), 400
        
    donation.claimed_by = None
    donation.claimed_at = None
    donation.claim_status = None
    donation.claim_decided_at = None
    db.session.commit()
    
    try:
        med_name = donation.medicine_name
        if not med_name and donation.medicine_id:
            med = db.session.get(Medicine, int(donation.medicine_id))
            med_name = med.name if med else f"donation #{item_id}"
        if not med_name:
            med_name = f"donation #{item_id}"
    except Exception:
        med_name = f"donation #{item_id}"
        
    _create_item('notifications', {
        'user_id': user_id,
        'type': 'donation',
        'title': 'Request Canceled',
        'message': f"You canceled your request for {med_name}.",
    })
    return jsonify({'message': 'Claim canceled'})

# -----------------------------
# SMTP Email & Password Reset
# -----------------------------

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import secrets
from datetime import datetime, timedelta

def send_reset_email(to_email, reset_link):
    resend_api_key = os.getenv('RESEND_API_KEY')
    resend_sender = os.getenv('RESEND_SENDER', 'onboarding@resend.dev')

    subject = "Reset Your MedoraLink Password"
    body = f"""Hello,

You requested a password reset for your MedoraLink account. Please click the link below to set a new password:

{reset_link}

This link will expire in 1 hour.

If you did not request this, you can ignore this email.

Best regards,
The MedoraLink Team
"""

    if resend_api_key:
        print("Attempting to send email via Resend API...")
        import urllib.request
        import urllib.error
        import json
        
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {resend_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "from": resend_sender,
            "to": [to_email],
            "subject": subject,
            "text": body
        }
        
        try:
            req = urllib.request.Request(
                url, 
                data=json.dumps(payload).encode('utf-8'), 
                headers=headers, 
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                res_body = response.read().decode('utf-8')
                print(f"Resend API Response: {res_body}")
                return True, "Email sent via Resend API successfully."
        except urllib.error.HTTPError as e:
            err_content = e.read().decode('utf-8')
            print(f"Resend HTTP Error {e.code}: {err_content}")
        except Exception as e:
            print(f"Resend Connection Exception: {e}")

    sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
    sendgrid_sender = os.getenv('SENDGRID_SENDER')

    if sendgrid_api_key and sendgrid_sender:
        print("Attempting to send email via SendGrid API...")
        import urllib.request
        import urllib.error
        import json
        
        url = "https://api.sendgrid.com/v3/mail/send"
        headers = {
            "Authorization": f"Bearer {sendgrid_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "personalizations": [
                {
                    "to": [{"email": to_email}],
                    "subject": subject
                }
            ],
            "from": {"email": sendgrid_sender},
            "content": [
                {
                    "type": "text/plain",
                    "value": body
                }
            ]
        }
        
        try:
            req = urllib.request.Request(
                url, 
                data=json.dumps(payload).encode('utf-8'), 
                headers=headers, 
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                print("Email sent via SendGrid API successfully.")
                return True, "Email sent via SendGrid API successfully."
        except urllib.error.HTTPError as e:
            err_content = e.read().decode('utf-8')
            print(f"SendGrid HTTP Error {e.code}: {err_content}")
        except Exception as e:
            print(f"SendGrid Connection Exception: {e}")

    smtp_server = os.getenv('SMTP_SERVER')
    smtp_port = os.getenv('SMTP_PORT', '587')
    smtp_username = os.getenv('SMTP_USERNAME')
    smtp_password = os.getenv('SMTP_PASSWORD')
    smtp_sender = os.getenv('SMTP_SENDER')

    if not smtp_sender or smtp_sender == "your-email@gmail.com":
        smtp_sender = smtp_username

    is_smtp_configured = (
        all([smtp_server, smtp_port, smtp_username, smtp_password]) and
        smtp_username != "your-email@gmail.com" and
        smtp_password != "your-app-password"
    )

    if is_smtp_configured:
        print("Attempting to send email via SMTP...")
        try:
            msg = MIMEMultipart()
            msg['From'] = smtp_sender
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            port = int(smtp_port)
            if port == 465:
                server = smtplib.SMTP_SSL(smtp_server, port, timeout=5)
            else:
                server = smtplib.SMTP(smtp_server, port, timeout=5)
                server.starttls()

            server.login(smtp_username, smtp_password)
            server.sendmail(smtp_sender, to_email, msg.as_string())
            server.quit()
            return True, "Email sent via SMTP successfully."
        except Exception as e:
            print(f"Error sending email via SMTP: {e}")
            
    print("\n=== [SIMULATED RESET EMAIL] ===")
    print(f"To: {to_email}")
    print(f"Subject: {subject}")
    print(f"Body:\n{body}")
    print("===============================\n")
    return False, "SMTP/API not configured or failed. Simulated email printed to server console."

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password_route():
    try:
        payload = request.get_json() or {}
        email = (payload.get('email') or '').strip().lower()
        if not email:
            return jsonify({'error': 'Email is required'}), 400

        user = User.query.filter(User.email.ilike(email)).first()
        if not user:
            return jsonify({'error': 'No account found with this email address.'}), 404

        token = secrets.token_urlsafe(32)
        expiry = (datetime.now() + timedelta(hours=1)).isoformat()

        user.reset_token = token
        user.reset_token_expiry = expiry
        db.session.commit()
        
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000').rstrip('/')
        reset_link = f"{frontend_url}/reset-password?token={token}"
        
        success, msg = send_reset_email(user.email, reset_link)

        return jsonify({
            'message': 'Password reset link processed.',
            'sent': success,
            'details': msg
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/verify-reset-token', methods=['GET'])
def verify_reset_token_route():
    token = request.args.get('token')
    if not token:
        return jsonify({'valid': False, 'error': 'Token is required'}), 400

    user = User.query.filter(User.reset_token == token).first()
    if user:
        expiry_str = user.reset_token_expiry
        if expiry_str:
            try:
                expiry = datetime.fromisoformat(expiry_str)
            except ValueError:
                expiry = datetime.now()
            if datetime.now() < expiry:
                return jsonify({'valid': True, 'email': user.email})
            else:
                return jsonify({'valid': False, 'error': 'Token has expired'})

    return jsonify({'valid': False, 'error': 'Invalid token'})

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password_route():
    try:
        payload = request.get_json() or {}
        token = payload.get('token')
        new_password = payload.get('password')

        if not token or not new_password:
            return jsonify({'error': 'Token and password are required'}), 400

        user = User.query.filter(User.reset_token == token).first()
        if user:
            expiry_str = user.reset_token_expiry
            if expiry_str:
                try:
                    expiry = datetime.fromisoformat(expiry_str)
                except ValueError:
                    expiry = datetime.now()
                if datetime.now() < expiry:
                    user.password = new_password
                    user.reset_token = None
                    user.reset_token_expiry = None
                    db.session.commit()
                    return jsonify({'message': 'Password reset successful. You can now log in.'})

        return jsonify({'error': 'Invalid or expired password reset token.'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', '5050'))
    app.run(debug=True, port=port)