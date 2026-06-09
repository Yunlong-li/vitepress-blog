from sqlalchemy import create_engine, String, Integer, DateTime, CHAR, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

# MySQL 数据库连接
engine = create_engine("mysql+pymysql://root:root@localhost:3306/ghjf")


class Base(DeclarativeBase):
    pass


class TownMember(Base):
    __tablename__ = "town_member"

    member_id: Mapped[str] = mapped_column(
        String(50), primary_key=True, comment="主键id"
    )
    full_name: Mapped[str] = mapped_column(String(50), nullable=False, comment="姓名")
    gender: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="性别 0-女 1-男"
    )
    emp_id: Mapped[str] = mapped_column(String(20), nullable=False, comment="工号")
    phone_number: Mapped[str] = mapped_column(
        String(15), nullable=False, comment="联系电话"
    )
    nature: Mapped[str] = mapped_column(
        CHAR(1),
        nullable=False,
        default="0",
        comment="职业类别 0 快递 1 外卖 2 网约车司机 3 户外工作者（环卫、交警、网格等）4其他",
    )
    picture: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="头像存储地址url"
    )
    status: Mapped[str] = mapped_column(
        CHAR(1), nullable=False, default="1", comment="0 待审核 1 审核通过 2 审核不通过"
    )
    open_id: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default="0", comment="微信openid"
    )
    pinyin_name: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="姓名拼音"
    )
    del_flag: Mapped[str] = mapped_column(
        CHAR(1), nullable=False, default="0", comment="0 未删除 1 已删除"
    )
    create_time: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, comment="创建时间"
    )
    update_time: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, comment="修改时间"
    )
    category: Mapped[str | None] = mapped_column(
        CHAR(1),
        nullable=True,
        default="0",
        comment="会员分类 0 普通会员 1 金融专家组成员 2 金融专家组副组长 3 金融专家组组长",
    )
    unit_name: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="单位名称"
    )
    idcard: Mapped[str | None] = mapped_column(
        String(18), nullable=True, comment="身份证号"
    )
    mealcode_issue_flag: Mapped[str | None] = mapped_column(
        CHAR(1),
        nullable=True,
        default="0",
        comment="是否已经发放就餐码 0-未发放 1-已发放",
    )
    mealcode_url: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="就餐码图片/url"
    )


def get_db():
    with Session(engine) as session:
        yield session
