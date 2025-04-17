package com.cctv.road.board.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cctv.road.board.dto.BoardDTO;
import com.cctv.road.board.entity.Board;
import com.cctv.road.board.repository.BoardCategoryRepository;
import com.cctv.road.board.repository.BoardRepository;
import com.cctv.road.member.entity.Member;
import com.cctv.road.member.repository.MemberRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class BoardService {

  private final BoardRepository boardRepository;
  private final MemberRepository memberRepository;
  private final BoardCategoryRepository categoryRepository;
  private final ReplyService replyService;

  public BoardService(BoardRepository boardRepository,
      MemberRepository memberRepository,
      BoardCategoryRepository categoryRepository,
      ReplyService replyService) {
    this.boardRepository = boardRepository;
    this.memberRepository = memberRepository;
    this.categoryRepository = categoryRepository;
    this.replyService = replyService;
  }

  /**
   * 게시글 작성
   */
  @Transactional
  public void writeBoard(BoardDTO dto, String userId) {
    int categoryId = dto.isNotice() ? 1 : dto.getCategoryId(); // ✅ 공지글이면 categoryId 무조건 1로 설정

    Integer maxSeq = boardRepository.findByCategoryIdOrderByBoardSeqDesc(categoryId)
        .stream()
        .map(Board::getBoardSeq)
        .max(Integer::compareTo)
        .orElse(0);

    Member member = memberRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));

    Board board = new Board();
    board.setCategoryId(categoryId); // ✅ 여기서 실제 저장되는 카테고리 ID 결정
    board.setBoardSeq(maxSeq + 1);
    board.setSubject(dto.getSubject());
    board.setContent(dto.getContent());
    board.setNotice(dto.isNotice());
    board.setMember(member);
    board.setNickName(member.getNickName());

    log.info("📝 저장 직전 board: {}", board);
    Board saved = boardRepository.save(board);
    log.info("✅ 저장 완료: {}", saved.getBoardNum());
  }

  /**
   * 게시글 조회수 증가
   */
  @Transactional
  public void increaseHit(int boardNum) {
    Board board = boardRepository.findByBoardNum(boardNum)
        .orElseThrow(() -> new RuntimeException("게시글이 존재하지 않습니다."));
    board.setHit(board.getHit() + 1);
  }

  /**
   * 게시글 조회 - boardNum 기준
   */
  public BoardDTO getBoard(int boardNum) {
    Board board = boardRepository.findByBoardNum(boardNum)
        .orElseThrow(() -> new RuntimeException("게시글이 존재하지 않습니다."));
    return BoardDTO.fromEntity(board);
  }

  /**
   * 게시글 조회 - categoryId + boardSeq 기준
   */
  public BoardDTO getBoardBySeq(int categoryId, int boardSeq) {
    Board board = boardRepository.findByCategoryIdAndBoardSeq(categoryId, boardSeq)
        .orElseThrow(() -> new RuntimeException("해당 게시글이 존재하지 않습니다."));
    return BoardDTO.fromEntity(board);
  }

  /**
   * 게시글 수정
   */
  @Transactional
  public void updatePostBySeq(int categoryId, int boardSeq, BoardDTO dto) {
      Board board = boardRepository.findByCategoryIdAndBoardSeq(categoryId, boardSeq)
          .orElseThrow(() -> new RuntimeException("해당 게시글이 존재하지 않습니다."));
  
      boolean isNotice = dto.isNotice();
  
      // 공지글 전환 시 카테고리 및 boardSeq 변경 필요
      if (isNotice && board.getCategoryId() != 1) {
          // 기존 boardSeq 충돌 방지: 공지용 seq 새로 부여
          int maxNoticeSeq = boardRepository.findByCategoryIdOrderByBoardSeqDesc(1)
              .stream()
              .map(Board::getBoardSeq)
              .max(Integer::compareTo)
              .orElse(0);
  
          board.setCategoryId(1);
          board.setBoardSeq(maxNoticeSeq + 1);
      }
  
      board.setSubject(dto.getSubject());
      board.setContent(dto.getContent());
      board.setNotice(isNotice);
  }  

  /**
   * 공지사항 목록 조회 (카테고리 관계없이 모든 공지)
   */
  public List<BoardDTO> getNoticeList() {
    return boardRepository.findByNoticeTrueOrderByBoardSeqDesc()
        .stream()
        .map(BoardDTO::fromEntity)
        .collect(Collectors.toList());
  }

  /**
   * 게시글 페이징 목록
   */
  public List<BoardDTO> getPagedPosts(int categoryId, int start, int size) {
    Pageable pageable = PageRequest.of(start / size, size, Sort.by(Sort.Order.desc("boardSeq")));

    return boardRepository.findNonNoticeByCategoryIdWithMember(categoryId, pageable)
        .stream()
        .map(BoardDTO::fromEntity)
        .collect(Collectors.toList());
  }

  /**
   * 카테고리별 게시글 총 개수
   */
  public int getTotalCountByCategory(int categoryId) {
    return boardRepository.countByCategoryId(categoryId);
  }

  /**
   * 게시글 + 댓글 삭제
   */
  @Transactional
  public void deletePostWithReplies(int boardNum) {
    Board board = boardRepository.findByBoardNum(boardNum)
        .orElseThrow(() -> new RuntimeException("게시글이 존재하지 않습니다."));

    int categoryId = board.getCategoryId(); // 🧠 삭제 전에 카테고리 확인

    replyService.deleteRepliesByBoard(board); // 댓글 먼저 삭제
    boardRepository.delete(board); // 게시글 삭제

    reorderBoardSeq(categoryId); // ✅ 순번 재정렬
  }

  /**
   * 게시글 순번 재정렬
   */
  @Transactional
  public void reorderBoardSeq(int categoryId) {
    List<Board> boards = boardRepository.findByCategoryIdOrderByBoardSeqAsc(categoryId);
    int seq = 1;
    for (Board board : boards) {
      board.setBoardSeq(seq++);
    }
    boardRepository.saveAll(boards); // 🔥 이 방식이 성능에 더 좋아!
  }
}
