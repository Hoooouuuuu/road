package com.cctv.road.board.dto;

import java.time.LocalDateTime;

import com.cctv.road.board.entity.Board;

import lombok.Data;

@Data
public class BoardDTO {
  private Integer boardNum; // 새로 추가된 PK
  private String userId;
  private String nickName;
  private Integer categoryId;
  private Integer boardSeq;
  private String subject;
  private String content;
  private Integer hit;
  private LocalDateTime writedate;
  private boolean notice;

  public static BoardDTO fromEntity(Board board) {
    BoardDTO dto = new BoardDTO();
    dto.setBoardNum(board.getBoardNum());
    dto.setUserId(board.getMember() != null ? board.getMember().getUserId() : null);
    dto.setNickName(board.getNickName());
    dto.setCategoryId(board.getCategoryId());
    dto.setBoardSeq(board.getBoardSeq());
    dto.setSubject(board.getSubject());
    dto.setContent(board.getContent());
    dto.setHit(board.getHit());
    dto.setWritedate(board.getWritedate());
    dto.setNotice(board.isNotice()); // ✅ 이건 boolean

    return dto;
  }
}
