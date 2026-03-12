from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.feedback import FeedbackItem
from app.schemas.feedback import FeedbackCreate, FeedbackRead, FeedbackUpdate, Theme, Status

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("/", response_model=list[FeedbackRead])
def list_feedback(
    search: str | None = Query(None),
    theme: Theme | None = Query(None),
    status: Status | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(FeedbackItem)
    if search:
        query = query.filter(FeedbackItem.client_name.ilike(f"%{search}%"))
    if theme:
        query = query.filter(FeedbackItem.theme == theme.value)
    if status:
        query = query.filter(FeedbackItem.status == status.value)
    query = query.order_by(FeedbackItem.date_logged.desc(), FeedbackItem.created_at.desc())
    return query.all()


@router.get("/{feedback_id}", response_model=FeedbackRead)
def get_feedback(feedback_id: int, db: Session = Depends(get_db)):
    item = db.query(FeedbackItem).filter(FeedbackItem.id == feedback_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found")
    return item


@router.post("/", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED)
def create_feedback(body: FeedbackCreate, db: Session = Depends(get_db)):
    item = FeedbackItem(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{feedback_id}", response_model=FeedbackRead)
def update_feedback(feedback_id: int, body: FeedbackUpdate, db: Session = Depends(get_db)):
    item = db.query(FeedbackItem).filter(FeedbackItem.id == feedback_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feedback(feedback_id: int, db: Session = Depends(get_db)):
    item = db.query(FeedbackItem).filter(FeedbackItem.id == feedback_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found")
    db.delete(item)
    db.commit()
